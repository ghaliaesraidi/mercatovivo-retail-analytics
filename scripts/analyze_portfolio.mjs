import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawDir = path.join(root, "data", "raw");
const outDir = path.join(root, "output");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const [headers, ...body] = rows;
  return body.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

async function load(name) {
  return parseCsv(await fs.readFile(path.join(rawDir, `${name}.csv`), "utf8"));
}

function dedupe(rows, key) {
  const seen = new Set();
  return rows.filter((row) => {
    if (seen.has(row[key])) return false;
    seen.add(row[key]);
    return true;
  });
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function round(value, places = 2) {
  const scale = 10 ** places;
  return Math.round((value + Number.EPSILON) * scale) / scale;
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function writeCsv(name, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))];
  await fs.writeFile(path.join(outDir, name), `${lines.join("\n")}\n`, "utf8");
}

const [storesRaw, productsRaw, customersRaw, promotionsRaw, transactionsRaw, itemsRaw, inventoryRaw, targetsRaw] = await Promise.all([
  load("stores"), load("products"), load("customers"), load("promotions"), load("transactions"), load("transaction_items"), load("inventory_weekly"), load("monthly_targets"),
]);

const stores = dedupe(storesRaw, "store_id");
const products = dedupe(productsRaw, "product_id").map((row) => ({
  ...row,
  category_clean: row.category.trim().replace(/\b\w/g, (letter) => letter.toUpperCase()),
  brand_type_clean: row.brand_type.trim().replace(/\b\w/g, (letter) => letter.toUpperCase()),
  unit_cost_eur: Number(row.unit_cost_eur),
  list_price_eur: Number(row.list_price_eur),
}));
const customers = dedupe(customersRaw, "customer_id");
const promotions = dedupe(promotionsRaw, "promotion_id").map((row) => ({...row, planned_discount_pct: Number(row.planned_discount_pct)}));
const paymentMap = new Map([["carta", "Card"], ["contanti", "Cash"], ["mobile", "Mobile"], ["gift card", "Gift Card"]]);
const transactions = dedupe(transactionsRaw, "transaction_id").map((row) => ({
  ...row,
  store_id_clean: row.store_id.trim().toUpperCase(),
  payment_method_clean: paymentMap.get(row.payment_method.trim().toLowerCase()) ?? row.payment_method.trim(),
  customer_id_clean: row.customer_id.trim() || "Anonymous",
  month: row.transaction_date.slice(0, 7),
}));

const storeMap = new Map(stores.map((row) => [row.store_id, row]));
const productMap = new Map(products.map((row) => [row.product_id, row]));
const customerMap = new Map(customers.map((row) => [row.customer_id, row]));
const promotionMap = new Map(promotions.map((row) => [row.promotion_id, row]));
const transactionMap = new Map(transactions.map((row) => [row.transaction_id, row]));

const duplicateGroups = (rows, key) => [...countBy(rows, (row) => row[key])]
  .filter(([, count]) => count > 1)
  .map(([value, count]) => ({value, count}));

const transactionDuplicateGroups = duplicateGroups(transactionsRaw, "transaction_id");
const itemDuplicateGroups = duplicateGroups(itemsRaw, "item_id");
const customerDuplicateGroups = duplicateGroups(customersRaw, "customer_id");

const dedupedItems = dedupe(itemsRaw, "item_id");
const issueCounts = {
  zero_quantity_rows: dedupedItems.filter((row) => Number(row.quantity) === 0).length,
  invalid_discount_rows: dedupedItems.filter((row) => Number(row.discount_pct) < 0 || Number(row.discount_pct) > 1).length,
  missing_product_id_rows: dedupedItems.filter((row) => !row.product_id.trim()).length,
  unmatched_product_rows_after_standardization: dedupedItems.filter((row) => row.product_id.trim() && !productMap.has(row.product_id.trim().toUpperCase())).length,
  unmatched_transaction_rows: dedupedItems.filter((row) => !transactionMap.has(row.transaction_id)).length,
  invalid_store_rows_exact_match: transactions.filter((row) => !storeMap.has(row.store_id)).length,
  invalid_store_rows_after_standardization: transactions.filter((row) => !storeMap.has(row.store_id_clean)).length,
};

const validItems = dedupedItems.filter((row) => {
  const quantity = Number(row.quantity);
  const discount = Number(row.discount_pct);
  const productId = row.product_id.trim().toUpperCase();
  return quantity !== 0 && discount >= 0 && discount <= 1 && productMap.has(productId) && transactionMap.has(row.transaction_id);
}).map((row) => {
  const tx = transactionMap.get(row.transaction_id);
  const product = productMap.get(row.product_id.trim().toUpperCase());
  const quantity = Number(row.quantity);
  const unitPrice = Number(row.unit_price_eur);
  const netSales = quantity * unitPrice;
  const productCost = quantity * product.unit_cost_eur;
  return {
    ...row,
    product_id_clean: product.product_id,
    quantity,
    unit_price_eur: unitPrice,
    discount_pct: Number(row.discount_pct),
    store_id: tx.store_id_clean,
    transaction_date: tx.transaction_date,
    month: tx.month,
    customer_id: tx.customer_id_clean,
    loyalty_segment: tx.customer_id_clean === "Anonymous" ? "Anonymous" : (customerMap.get(tx.customer_id_clean)?.loyalty_segment ?? "Unknown"),
    category: product.category_clean,
    brand_type: product.brand_type_clean,
    product_name: product.product_name,
    promotion_name: row.promotion_id ? (promotionMap.get(row.promotion_id)?.promotion_name ?? "Unknown promotion") : "No promotion",
    net_sales_eur: netSales,
    product_cost_eur: productCost,
    gross_profit_eur: netSales - productCost,
  };
});

function aggregate(rows, keys) {
  const groups = new Map();
  for (const row of rows) {
    const values = keys.map((key) => row[key]);
    const id = JSON.stringify(values);
    const group = groups.get(id) ?? {
      values,
      net_sales_eur: 0,
      product_cost_eur: 0,
      gross_profit_eur: 0,
      net_units: 0,
      line_count: 0,
      transactions: new Set(),
      discount_weighted_value: 0,
      discount_weight: 0,
    };
    group.net_sales_eur += row.net_sales_eur;
    group.product_cost_eur += row.product_cost_eur;
    group.gross_profit_eur += row.gross_profit_eur;
    group.net_units += row.quantity;
    group.line_count += 1;
    group.transactions.add(row.transaction_id);
    group.discount_weighted_value += row.discount_pct * Math.max(row.quantity, 0);
    group.discount_weight += Math.max(row.quantity, 0);
    groups.set(id, group);
  }
  return [...groups.values()].map((group) => {
    const result = Object.fromEntries(keys.map((key, index) => [key, group.values[index]]));
    result.net_sales_eur = round(group.net_sales_eur);
    result.product_cost_eur = round(group.product_cost_eur);
    result.gross_profit_eur = round(group.gross_profit_eur);
    result.gross_margin_pct = group.net_sales_eur ? round(group.gross_profit_eur / group.net_sales_eur, 4) : null;
    result.net_units = group.net_units;
    result.transactions = group.transactions.size;
    result.average_basket_eur = group.transactions.size ? round(group.net_sales_eur / group.transactions.size) : null;
    result.average_discount_pct = group.discount_weight ? round(group.discount_weighted_value / group.discount_weight, 4) : 0;
    result.line_count = group.line_count;
    return result;
  });
}

const overall = aggregate(validItems, [])[0];
const byStore = aggregate(validItems, ["store_id"]).map((row) => ({...row, store_name: storeMap.get(row.store_id)?.store_name})).sort((a, b) => b.net_sales_eur - a.net_sales_eur);
const byCategory = aggregate(validItems, ["category"]).sort((a, b) => b.net_sales_eur - a.net_sales_eur);
const byMonth = aggregate(validItems, ["month"]).sort((a, b) => a.month.localeCompare(b.month));
const byBrand = aggregate(validItems, ["brand_type"]).sort((a, b) => b.net_sales_eur - a.net_sales_eur);
const byLoyalty = aggregate(validItems, ["loyalty_segment"]).sort((a, b) => b.net_sales_eur - a.net_sales_eur);
const byPromotion = aggregate(validItems.filter((row) => row.promotion_id), ["promotion_id", "promotion_name"]).sort((a, b) => b.net_sales_eur - a.net_sales_eur);
const promoVsNonPromo = aggregate(validItems.map((row) => ({...row, promo_status: row.promotion_id ? "Promotion" : "No promotion"})), ["promo_status"]);
const byStoreCategory = aggregate(validItems, ["store_id", "category"]).map((row) => ({...row, store_name: storeMap.get(row.store_id)?.store_name}));
const byProduct = aggregate(validItems, ["product_id_clean", "product_name", "category"]).sort((a, b) => b.net_sales_eur - a.net_sales_eur);

const targets = targetsRaw.map((row) => ({...row, month_key: row.month.slice(0, 7), revenue_target_eur: Number(row.revenue_target_eur)}));
const actualStoreMonth = new Map(aggregate(validItems, ["store_id", "month"]).map((row) => [`${row.store_id}|${row.month}`, row]));
const targetComparison = targets.map((target) => {
  const actual = actualStoreMonth.get(`${target.store_id}|${target.month_key}`);
  const sales = actual?.net_sales_eur ?? 0;
  const variance = sales - target.revenue_target_eur;
  return {
    month: target.month_key,
    store_id: target.store_id,
    store_name: storeMap.get(target.store_id)?.store_name,
    net_sales_eur: round(sales),
    revenue_target_eur: round(target.revenue_target_eur),
    variance_eur: round(variance),
    variance_pct: target.revenue_target_eur ? round(variance / target.revenue_target_eur, 4) : null,
  };
});
const targetSummary = [...new Set(targetComparison.map((row) => row.store_id))].map((storeId) => {
  const rows = targetComparison.filter((row) => row.store_id === storeId);
  const sales = rows.reduce((sum, row) => sum + row.net_sales_eur, 0);
  const target = rows.reduce((sum, row) => sum + row.revenue_target_eur, 0);
  return {
    store_id: storeId,
    store_name: storeMap.get(storeId)?.store_name,
    net_sales_eur: round(sales),
    revenue_target_eur: round(target),
    variance_eur: round(sales - target),
    variance_pct: round((sales - target) / target, 4),
    months_above_target: rows.filter((row) => row.variance_eur >= 0).length,
  };
}).sort((a, b) => a.variance_pct - b.variance_pct);

const inventory = inventoryRaw.map((row) => ({
  ...row,
  opening_stock_units: Number(row.opening_stock_units),
  delivered_units: Number(row.delivered_units),
  sold_units: Number(row.sold_units),
  waste_units: Number(row.waste_units),
  closing_stock_units: Number(row.closing_stock_units),
  stockout_days: Number(row.stockout_days),
}));
const inventoryIssues = inventory.filter((row) => row.opening_stock_units + row.delivered_units - row.sold_units - row.waste_units !== row.closing_stock_units);
const inventoryGroup = new Map();
for (const row of inventory) {
  const product = productMap.get(row.product_id);
  const key = `${row.store_id}|${product.category_clean}`;
  const group = inventoryGroup.get(key) ?? {store_id: row.store_id, category: product.category_clean, opening: 0, delivered: 0, waste_units: 0, waste_cost_eur: 0, stockout_days: 0};
  group.opening += row.opening_stock_units;
  group.delivered += row.delivered_units;
  group.waste_units += row.waste_units;
  group.waste_cost_eur += row.waste_units * product.unit_cost_eur;
  group.stockout_days += row.stockout_days;
  inventoryGroup.set(key, group);
}
const inventoryByStoreCategory = [...inventoryGroup.values()].map((row) => ({
  store_id: row.store_id,
  store_name: storeMap.get(row.store_id)?.store_name,
  category: row.category,
  waste_units: row.waste_units,
  waste_cost_eur: round(row.waste_cost_eur),
  waste_rate_pct: row.opening + row.delivered ? round(row.waste_units / (row.opening + row.delivered), 4) : null,
  stockout_days: row.stockout_days,
}));
const inventoryByStore = [...new Set(stores.map((row) => row.store_id))].map((storeId) => {
  const rows = inventoryByStoreCategory.filter((row) => row.store_id === storeId);
  const rawRows = inventory.filter((row) => row.store_id === storeId);
  const openingDelivered = rawRows.reduce((sum, row) => sum + row.opening_stock_units + row.delivered_units, 0);
  const wasteUnits = rawRows.reduce((sum, row) => sum + row.waste_units, 0);
  return {
    store_id: storeId,
    store_name: storeMap.get(storeId)?.store_name,
    waste_units: wasteUnits,
    waste_cost_eur: round(rows.reduce((sum, row) => sum + row.waste_cost_eur, 0)),
    waste_rate_pct: round(wasteUnits / openingDelivered, 4),
    stockout_days: rows.reduce((sum, row) => sum + row.stockout_days, 0),
  };
}).sort((a, b) => b.waste_cost_eur - a.waste_cost_eur);

const categoryMargin = new Map(byCategory.map((row) => [row.category, row.gross_margin_pct]));
const overallMargin = overall.gross_margin_pct;
const storeCategoryExceptions = byStoreCategory
  .filter((row) => row.net_sales_eur >= 1000 && row.gross_margin_pct < overallMargin)
  .map((row) => ({...row, margin_gap_vs_chain_pp: round((row.gross_margin_pct - overallMargin) * 100, 2), category_margin_pct: categoryMargin.get(row.category)}))
  .sort((a, b) => a.gross_margin_pct - b.gross_margin_pct);

const productExceptions = byProduct
  .map((row) => {
    const inventoryRows = inventoryByStoreCategory.filter((inv) => inv.category === row.category);
    return {...row, category_margin_pct: categoryMargin.get(row.category), category_stockout_days: inventoryRows.reduce((sum, inv) => sum + inv.stockout_days, 0)};
  })
  .sort((a, b) => a.gross_margin_pct - b.gross_margin_pct)
  .slice(0, 10);

const quality = {
  row_counts: {
    stores: storesRaw.length,
    products: productsRaw.length,
    customers: customersRaw.length,
    promotions: promotionsRaw.length,
    transactions: transactionsRaw.length,
    transaction_items: itemsRaw.length,
    inventory_weekly: inventoryRaw.length,
    monthly_targets: targetsRaw.length,
  },
  duplicates: {
    customer_ids: customerDuplicateGroups,
    transaction_ids: transactionDuplicateGroups,
    item_ids: itemDuplicateGroups,
  },
  issue_counts: issueCounts,
  inconsistent_labels: {
    categories: [...new Set(productsRaw.map((row) => row.category))].filter((value) => value !== value.trim() || value !== value.trim().replace(/\b\w/g, (letter) => letter.toUpperCase())),
    brand_types: [...new Set(productsRaw.map((row) => row.brand_type))].filter((value) => value !== value.trim().replace(/\b\w/g, (letter) => letter.toUpperCase())),
    payment_methods: [...new Set(transactionsRaw.map((row) => row.payment_method))].filter((value) => !["Card", "Cash", "Mobile", "Gift Card"].includes(value)),
  },
  inventory_reconciliation_failures: inventoryIssues.length,
  clean_counts: {transactions: transactions.length, customers: customers.length, transaction_items: validItems.length},
};

const result = {
  generated_at_utc: new Date().toISOString(),
  quality,
  overall,
  by_store: byStore,
  by_category: byCategory,
  by_month: byMonth,
  by_brand: byBrand,
  by_loyalty: byLoyalty,
  promo_vs_non_promo: promoVsNonPromo,
  promotions: byPromotion,
  target_summary: targetSummary,
  target_comparison: targetComparison,
  inventory_by_store: inventoryByStore,
  inventory_by_store_category: inventoryByStoreCategory,
  store_category_exceptions: storeCategoryExceptions,
  product_exceptions: productExceptions,
};

await fs.mkdir(outDir, {recursive: true});
await fs.writeFile(path.join(outDir, "analysis_results.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
await Promise.all([
  writeCsv("monthly_performance.csv", byMonth),
  writeCsv("store_performance.csv", byStore),
  writeCsv("category_performance.csv", byCategory),
  writeCsv("promotion_performance.csv", byPromotion),
  writeCsv("store_targets.csv", targetSummary),
  writeCsv("inventory_store_summary.csv", inventoryByStore),
  writeCsv("store_category_exceptions.csv", storeCategoryExceptions),
]);

console.log(JSON.stringify({quality, overall, byStore, byCategory, promoVsNonPromo, targetSummary, inventoryByStore, storeCategoryExceptions: storeCategoryExceptions.slice(0, 10)}, null, 2));
