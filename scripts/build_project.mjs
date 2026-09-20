import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Workbook,
  SpreadsheetFile,
} from "@oai/artifact-tool";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const rawDir = path.join(projectRoot, "data", "raw");
const workbookDir = path.join(projectRoot, "workbook");

// Deterministic pseudo-random generator: every build produces the same portfolio dataset.
let seed = 20250901;
function random() {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
}

function choice(items) {
  return items[Math.floor(random() * items.length)];
}

function weightedChoice(items, weights) {
  const total = weights.reduce((sum, value) => sum + value, 0);
  let cursor = random() * total;
  for (let i = 0; i < items.length; i += 1) {
    cursor -= weights[i];
    if (cursor <= 0) return items[i];
  }
  return items.at(-1);
}

function integer(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function dateFromParts(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day));
}

function monthKey(dateText) {
  return dateText.slice(0, 7);
}

function mondayOf(dateText) {
  const date = new Date(`${dateText}T00:00:00Z`);
  const day = date.getUTCDay();
  const shift = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + shift);
  return isoDate(date);
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

async function writeCsv(filename, rows, columns) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(row[column])).join(","));
  }
  await fs.writeFile(path.join(rawDir, filename), `${lines.join("\n")}\n`, "utf8");
}

const stores = [
  { store_id: "MV001", store_name: "MercatoVivo Catania Centro", city: "Catania", province: "CT", format: "Urban", floor_area_sqm: 1180, opening_date: "2017-03-18" },
  { store_id: "MV002", store_name: "MercatoVivo Siracusa Aretusa", city: "Siracusa", province: "SR", format: "Supermarket", floor_area_sqm: 1640, opening_date: "2015-09-05" },
  { store_id: "MV003", store_name: "MercatoVivo Ragusa Iblea", city: "Ragusa", province: "RG", format: "Supermarket", floor_area_sqm: 1510, opening_date: "2019-11-23" },
  { store_id: "MV004", store_name: "MercatoVivo Lentini Etna", city: "Lentini", province: "SR", format: "Neighborhood", floor_area_sqm: 930, opening_date: "2021-06-12" },
  { store_id: "MV005", store_name: "MercatoVivo Palermo Liberta", city: "Palermo", province: "PA", format: "Urban", floor_area_sqm: 1870, opening_date: "2014-02-15" },
];

const productBlueprints = [
  ["Pasta di semola 500g", "Pantry", "Pasta & Rice", "National", "SUP01", 0.62, 1.19, false, 1.25],
  ["Riso Arborio 1kg", "Pantry", "Pasta & Rice", "National", "SUP01", 1.55, 2.89, false, 0.75],
  ["Passata di pomodoro 700g", "Pantry", "Sauces", "Private Label", "SUP01", 0.58, 1.09, false, 1.05],
  ["Olio extra vergine 1L", "Pantry", "Oil", "National", "SUP02", 5.65, 8.49, false, 0.42],
  ["Tonno in scatola 3x80g", "Pantry", "Canned Food", "National", "SUP02", 2.15, 3.99, false, 0.55],
  ["Farina tipo 00 1kg", "Pantry", "Baking", "Private Label", "SUP01", 0.52, 0.99, false, 0.62],
  ["Pane casereccio", "Bakery", "Fresh Bread", "Private Label", "SUP03", 1.12, 2.39, true, 1.18],
  ["Filone di semola", "Bakery", "Fresh Bread", "Private Label", "SUP03", 0.88, 1.99, true, 1.02],
  ["Cornetto crema", "Bakery", "Pastry", "Private Label", "SUP03", 0.49, 1.10, true, 0.82],
  ["Focaccia rosmarino", "Bakery", "Savory Bakery", "Private Label", "SUP03", 0.91, 2.20, true, 0.68],
  ["Latte intero 1L", "Dairy", "Milk", "Private Label", "SUP04", 0.79, 1.39, true, 1.22],
  ["Yogurt bianco 2x125g", "Dairy", "Yogurt", "National", "SUP04", 0.74, 1.49, true, 0.90],
  ["Mozzarella 125g", "Dairy", "Cheese", "Private Label", "SUP04", 0.72, 1.39, true, 1.14],
  ["Parmigiano Reggiano 200g", "Dairy", "Cheese", "National", "SUP04", 2.95, 4.79, true, 0.48],
  ["Burro 250g", "Dairy", "Butter", "National", "SUP04", 1.36, 2.35, true, 0.55],
  ["Arance Sicilia 1kg", "Fresh Produce", "Fruit", "Local", "SUP05", 0.86, 1.69, true, 1.05],
  ["Pomodoro ciliegino 500g", "Fresh Produce", "Vegetables", "Local", "SUP05", 1.12, 2.39, true, 0.94],
  ["Zucchine 1kg", "Fresh Produce", "Vegetables", "Local", "SUP05", 1.08, 2.19, true, 0.70],
  ["Banane 1kg", "Fresh Produce", "Fruit", "National", "SUP05", 0.98, 1.79, true, 1.10],
  ["Insalata mista 200g", "Fresh Produce", "Ready Vegetables", "Private Label", "SUP05", 0.88, 1.69, true, 0.74],
  ["Petto di pollo 500g", "Meat & Seafood", "Poultry", "National", "SUP06", 3.35, 5.79, true, 0.62],
  ["Salsiccia siciliana 400g", "Meat & Seafood", "Pork", "Local", "SUP06", 2.78, 4.99, true, 0.57],
  ["Orata fresca 400g", "Meat & Seafood", "Fish", "Local", "SUP06", 4.85, 7.99, true, 0.32],
  ["Prosciutto cotto 150g", "Meat & Seafood", "Deli", "National", "SUP06", 1.62, 2.99, true, 0.60],
  ["Acqua minerale 6x1.5L", "Beverages", "Water", "Private Label", "SUP07", 1.08, 1.89, false, 0.88],
  ["Cola 1.5L", "Beverages", "Soft Drinks", "National", "SUP07", 0.94, 1.89, false, 0.85],
  ["Succo arancia 1L", "Beverages", "Juice", "Private Label", "SUP07", 0.82, 1.59, false, 0.65],
  ["Birra bionda 3x330ml", "Beverages", "Beer", "National", "SUP07", 1.75, 3.49, false, 0.70],
  ["Vino rosso Sicilia DOC", "Beverages", "Wine", "Local", "SUP07", 3.15, 5.99, false, 0.38],
  ["Detersivo lavatrice 30 lavaggi", "Household", "Laundry", "National", "SUP08", 3.85, 6.99, false, 0.34],
  ["Carta cucina 3 rotoli", "Household", "Paper", "Private Label", "SUP08", 1.38, 2.69, false, 0.48],
  ["Detergente pavimenti 1L", "Household", "Cleaning", "Private Label", "SUP08", 1.04, 1.99, false, 0.42],
  ["Sacchi spazzatura 20pz", "Household", "Cleaning", "Private Label", "SUP08", 0.93, 1.89, false, 0.36],
  ["Spugne cucina 3pz", "Household", "Cleaning", "Private Label", "SUP08", 0.71, 1.49, false, 0.32],
  ["Shampoo delicato 250ml", "Personal Care", "Hair Care", "National", "SUP09", 1.88, 3.69, false, 0.30],
  ["Dentifricio 75ml", "Personal Care", "Oral Care", "National", "SUP09", 1.22, 2.49, false, 0.40],
  ["Sapone mani 500ml", "Personal Care", "Body Care", "Private Label", "SUP09", 0.84, 1.69, false, 0.38],
  ["Carta igienica 8 rotoli", "Personal Care", "Paper", "Private Label", "SUP09", 2.38, 4.39, false, 0.52],
  ["Biscotti integrali 350g", "Snacks", "Biscuits", "National", "SUP10", 1.18, 2.29, false, 0.66],
  ["Cioccolato fondente 100g", "Snacks", "Chocolate", "National", "SUP10", 0.82, 1.69, false, 0.54],
];

const products = productBlueprints.map((row, index) => ({
  product_id: `PR${String(index + 1).padStart(3, "0")}`,
  sku: `SKU-${String(31001 + index)}`,
  product_name: row[0],
  category: row[1],
  subcategory: row[2],
  brand_type: row[3],
  supplier_id: row[4],
  unit_cost_eur: row[5],
  list_price_eur: row[6],
  perishable_flag: row[7] ? "Y" : "N",
  demand_weight: row[8],
}));

// Three formatting inconsistencies are intentional audit exercises.
products[7].category = "Bakery ";
products[17].category = "fresh produce";
products[35].brand_type = "national";

const customerCities = ["Catania", "Siracusa", "Ragusa", "Lentini", "Palermo", "Augusta", "Acireale", "Modica"];
const loyaltySegments = ["Bronze", "Silver", "Gold"];
const customers = [];
for (let i = 1; i <= 900; i += 1) {
  const signupYear = weightedChoice([2021, 2022, 2023, 2024, 2025], [9, 14, 19, 25, 33]);
  const signupMonth = integer(0, signupYear === 2025 ? 10 : 11);
  const signupDay = integer(1, 28);
  customers.push({
    customer_id: `CU${String(i).padStart(4, "0")}`,
    loyalty_segment: weightedChoice(loyaltySegments, [55, 32, 13]),
    age_band: weightedChoice(["18-24", "25-34", "35-44", "45-54", "55-64", "65+"], [9, 23, 22, 19, 15, 12]),
    city: choice(customerCities),
    signup_date: isoDate(dateFromParts(signupYear, signupMonth, signupDay)),
    marketing_opt_in: random() < 0.62 ? "Y" : "N",
  });
}
for (let i = 0; i < 10; i += 1) customers[integer(0, customers.length - 1)].age_band = "";
customers.push({ ...customers[121] }, { ...customers[488] });

const promotions = [
  ["PROMO001", "Gennaio Dispensa", "2025-01-10", "2025-01-26", "CATEGORY", "Pantry", 0.15, "Flyer"],
  ["PROMO002", "San Valentino Dolci", "2025-02-08", "2025-02-16", "CATEGORY", "Snacks", 0.20, "App"],
  ["PROMO003", "Freschezza di Primavera", "2025-03-14", "2025-03-30", "CATEGORY", "Fresh Produce", 0.12, "In-store"],
  ["PROMO004", "Pasqua in Tavola", "2025-04-05", "2025-04-20", "CATEGORY", "Meat & Seafood", 0.15, "Flyer"],
  ["PROMO005", "Colazione Conveniente", "2025-05-02", "2025-05-18", "CATEGORY", "Dairy", 0.10, "App"],
  ["PROMO006", "Estate da Bere", "2025-06-06", "2025-06-29", "CATEGORY", "Beverages", 0.18, "Flyer"],
  ["PROMO007", "Festa del Pane", "2025-07-04", "2025-07-13", "CATEGORY", "Bakery", 0.15, "In-store"],
  ["PROMO008", "Ferragosto Sicilia", "2025-08-01", "2025-08-17", "CATEGORY", "Meat & Seafood", 0.20, "App"],
  ["PROMO009", "Rientro Pulito", "2025-09-05", "2025-09-21", "CATEGORY", "Household", 0.22, "Flyer"],
  ["PROMO010", "Benessere Autunno", "2025-10-03", "2025-10-19", "CATEGORY", "Personal Care", 0.18, "App"],
  ["PROMO011", "Private Label Days", "2025-11-07", "2025-11-23", "BRAND_TYPE", "Private Label", 0.15, "Loyalty"],
  ["PROMO012", "Natale in Dispensa", "2025-12-05", "2025-12-24", "CATEGORY", "Pantry", 0.18, "Flyer"],
  ["PROMO013", "Weekend Mozzarella", "2025-05-23", "2025-05-25", "PRODUCT", "PR013", 0.25, "App"],
  ["PROMO014", "Weekend Arance", "2025-12-12", "2025-12-14", "PRODUCT", "PR016", 0.25, "Loyalty"],
].map((row) => ({
  promotion_id: row[0],
  promotion_name: row[1],
  start_date: row[2],
  end_date: row[3],
  scope_type: row[4],
  scope_value: row[5],
  planned_discount_pct: row[6],
  campaign_channel: row[7],
}));

function eligiblePromotion(dateText, product) {
  return promotions.find((promotion) => {
    if (dateText < promotion.start_date || dateText > promotion.end_date) return false;
    if (promotion.scope_type === "PRODUCT") return product.product_id === promotion.scope_value;
    if (promotion.scope_type === "BRAND_TYPE") return product.brand_type.trim().toLowerCase() === promotion.scope_value.toLowerCase();
    return product.category.trim().toLowerCase() === promotion.scope_value.toLowerCase();
  });
}

const monthWeights = [0.86, 0.82, 0.94, 1.02, 1.05, 1.12, 1.20, 1.28, 1.02, 0.98, 1.08, 1.34];
const storeWeights = [1.15, 1.02, 0.90, 0.73, 1.30];
const transactions = [];
const transactionItems = [];
const transactionContext = new Map();

for (let transactionNumber = 1; transactionNumber <= 12000; transactionNumber += 1) {
  const monthIndex = weightedChoice([...Array(12).keys()], monthWeights);
  const day = integer(1, new Date(Date.UTC(2025, monthIndex + 1, 0)).getUTCDate());
  const dateText = isoDate(dateFromParts(2025, monthIndex, day));
  const store = weightedChoice(stores, storeWeights);
  const transactionId = `TX${String(transactionNumber).padStart(6, "0")}`;
  const isWeekend = [0, 6].includes(new Date(`${dateText}T00:00:00Z`).getUTCDay());
  const hour = weightedChoice([8, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20], [4, 7, 9, 10, 8, 4, 5, 8, 12, 14, 9]);
  const minute = integer(0, 59);
  let paymentMethod = weightedChoice(["Card", "Cash", "Mobile", "Gift Card"], [56, 31, 9, 4]);
  if (random() < 0.025) paymentMethod = choice(["carta", "Contanti ", "MOBILE", "gift card"]);
  const customerId = random() < 0.38 ? "" : choice(customers.slice(0, 900)).customer_id;
  const itemCount = weightedChoice([1, 2, 3, 4, 5, 6], isWeekend ? [10, 18, 25, 23, 15, 9] : [16, 25, 26, 18, 10, 5]);

  transactions.push({
    transaction_id: transactionId,
    transaction_date: dateText,
    transaction_time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
    store_id: store.store_id,
    customer_id: customerId,
    payment_method: paymentMethod,
    sales_channel: "In-store",
    cashier_lane: integer(1, Math.max(3, Math.round(store.floor_area_sqm / 230))),
  });
  transactionContext.set(transactionId, { dateText, storeId: store.store_id });

  const usedProducts = new Set();
  for (let line = 1; line <= itemCount; line += 1) {
    let product = weightedChoice(products, products.map((item) => item.demand_weight));
    let retries = 0;
    while (usedProducts.has(product.product_id) && retries < 10) {
      product = weightedChoice(products, products.map((item) => item.demand_weight));
      retries += 1;
    }
    usedProducts.add(product.product_id);
    const activePromotion = eligiblePromotion(dateText, product);
    const promoProbability = store.store_id === "MV005" ? 0.72 : store.store_id === "MV003" ? 0.48 : 0.62;
    const appliedPromotion = activePromotion && random() < promoProbability ? activePromotion : null;
    let discount = appliedPromotion ? Math.max(0, appliedPromotion.planned_discount_pct + choice([-0.01, 0, 0, 0.01])) : 0;
    if (appliedPromotion && store.store_id === "MV005" && random() < 0.22) discount += 0.03;
    const isReturn = random() < 0.0035;
    const quantity = isReturn ? -1 : weightedChoice([1, 2, 3], [79, 17, 4]);
    const storePriceFactor = store.store_id === "MV005" ? 1.015 : store.store_id === "MV004" ? 0.99 : 1;
    const unitPrice = round(product.list_price_eur * storePriceFactor * (1 - discount), 2);
    transactionItems.push({
      item_id: `IT${String(transactionItems.length + 1).padStart(7, "0")}`,
      transaction_id: transactionId,
      line_number: line,
      product_id: product.product_id,
      quantity,
      unit_price_eur: unitPrice,
      discount_pct: round(discount, 2),
      promotion_id: appliedPromotion ? appliedPromotion.promotion_id : "",
      line_type: isReturn ? "RETURN" : "SALE",
    });
  }
}

// Controlled raw-data defects for the learner to find and document.
for (const rowIndex of [194, 1288, 4033, 8112, 10990]) transactions[rowIndex].store_id = transactions[rowIndex].store_id.toLowerCase();
transactions.push({ ...transactions[250] }, { ...transactions[7099] });
for (const rowIndex of [901, 5222, 17003, 25111]) transactionItems[rowIndex].quantity = 0;
for (const rowIndex of [2500, 11200, 21950]) transactionItems[rowIndex].discount_pct = 1.25;
for (const rowIndex of [3760, 8800, 19100, 26350]) transactionItems[rowIndex].product_id = "";
for (const rowIndex of [420, 1999, 5770, 9050, 13200, 16777, 20450, 24001, 27100, 30125, 32500, 35000]) {
  if (transactionItems[rowIndex]) transactionItems.push({ ...transactionItems[rowIndex] });
}

const itemByWeekStoreProduct = new Map();
const salesByMonthStore = new Map();
for (const item of transactionItems) {
  const context = transactionContext.get(item.transaction_id);
  const product = products.find((candidate) => candidate.product_id === item.product_id);
  if (!context || !product || item.quantity === 0 || item.discount_pct > 1) continue;
  const weeklyKey = `${mondayOf(context.dateText)}|${context.storeId}|${product.product_id}`;
  const weekly = itemByWeekStoreProduct.get(weeklyKey) ?? { units: 0 };
  weekly.units += item.quantity;
  itemByWeekStoreProduct.set(weeklyKey, weekly);

  const monthlyKey = `${monthKey(context.dateText)}|${context.storeId}`;
  const monthly = salesByMonthStore.get(monthlyKey) ?? { revenue: 0, cost: 0 };
  monthly.revenue += item.quantity * item.unit_price_eur;
  monthly.cost += item.quantity * product.unit_cost_eur;
  salesByMonthStore.set(monthlyKey, monthly);
}

const weekStarts = [];
for (let date = dateFromParts(2024, 11, 30); date <= dateFromParts(2025, 11, 29); date.setUTCDate(date.getUTCDate() + 7)) {
  weekStarts.push(isoDate(date));
}

const inventoryWeekly = [];
const openingStock = new Map();
for (const weekStart of weekStarts) {
  for (const store of stores) {
    for (const product of products) {
      const key = `${weekStart}|${store.store_id}|${product.product_id}`;
      const stockKey = `${store.store_id}|${product.product_id}`;
      const opening = openingStock.get(stockKey) ?? integer(18, product.perishable_flag === "Y" ? 48 : 72);
      const unitsSold = Math.max(0, Math.round(itemByWeekStoreProduct.get(key)?.units ?? 0));
      const baseWasteRate = product.perishable_flag === "Y" ? 0.035 : 0.003;
      const storeWasteFactor = store.store_id === "MV004" ? 1.9 : store.store_id === "MV003" ? 1.2 : 1;
      const waste = Math.max(0, Math.round((opening + unitsSold * 0.45) * baseWasteRate * storeWasteFactor + random() * 1.2));
      const desiredClosing = product.perishable_flag === "Y" ? integer(8, 24) : integer(16, 42);
      const deliveries = Math.max(0, unitsSold + waste + desiredClosing - opening + integer(-3, 5));
      const closing = Math.max(0, opening + deliveries - unitsSold - waste);
      let stockoutDays = closing <= 2 ? integer(1, 3) : 0;
      if (store.store_id === "MV004" && unitsSold > 3 && random() < 0.16) stockoutDays = Math.max(stockoutDays, integer(1, 4));
      inventoryWeekly.push({
        week_start: weekStart,
        store_id: store.store_id,
        product_id: product.product_id,
        opening_stock_units: opening,
        delivered_units: deliveries,
        sold_units: unitsSold,
        waste_units: waste,
        closing_stock_units: closing,
        stockout_days: stockoutDays,
      });
      openingStock.set(stockKey, closing);
    }
  }
}

const monthlyTargets = [];
for (let month = 1; month <= 12; month += 1) {
  const monthText = `2025-${String(month).padStart(2, "0")}`;
  for (const store of stores) {
    const actual = salesByMonthStore.get(`${monthText}|${store.store_id}`) ?? { revenue: 0, cost: 0 };
    const targetFactorByStore = { MV001: 1.01, MV002: 0.99, MV003: 1.03, MV004: 1.07, MV005: 0.97 };
    const actualMargin = actual.revenue === 0 ? 0 : (actual.revenue - actual.cost) / actual.revenue;
    monthlyTargets.push({
      month: `${monthText}-01`,
      store_id: store.store_id,
      revenue_target_eur: round(actual.revenue * targetFactorByStore[store.store_id] * (0.98 + random() * 0.04), 2),
      gross_margin_target_pct: round(Math.max(0.22, actualMargin + (store.store_id === "MV005" ? 0.025 : 0.01)), 3),
      waste_rate_target_pct: store.store_id === "MV004" ? 0.025 : 0.018,
      stockout_days_target: store.store_id === "MV004" ? 22 : 15,
    });
  }
}

await fs.mkdir(rawDir, { recursive: true });
await fs.mkdir(workbookDir, { recursive: true });

await writeCsv("stores.csv", stores, ["store_id", "store_name", "city", "province", "format", "floor_area_sqm", "opening_date"]);
await writeCsv("products.csv", products, ["product_id", "sku", "product_name", "category", "subcategory", "brand_type", "supplier_id", "unit_cost_eur", "list_price_eur", "perishable_flag"]);
await writeCsv("customers.csv", customers, ["customer_id", "loyalty_segment", "age_band", "city", "signup_date", "marketing_opt_in"]);
await writeCsv("promotions.csv", promotions, ["promotion_id", "promotion_name", "start_date", "end_date", "scope_type", "scope_value", "planned_discount_pct", "campaign_channel"]);
await writeCsv("transactions.csv", transactions, ["transaction_id", "transaction_date", "transaction_time", "store_id", "customer_id", "payment_method", "sales_channel", "cashier_lane"]);
await writeCsv("transaction_items.csv", transactionItems, ["item_id", "transaction_id", "line_number", "product_id", "quantity", "unit_price_eur", "discount_pct", "promotion_id", "line_type"]);
await writeCsv("inventory_weekly.csv", inventoryWeekly, ["week_start", "store_id", "product_id", "opening_stock_units", "delivered_units", "sold_units", "waste_units", "closing_stock_units", "stockout_days"]);
await writeCsv("monthly_targets.csv", monthlyTargets, ["month", "store_id", "revenue_target_eur", "gross_margin_target_pct", "waste_rate_target_pct", "stockout_days_target"]);

const dictionary = [
  ["stores", "store_id", "text", "Primary key", "Unique supermarket identifier"],
  ["stores", "store_name", "text", "Required", "Public-facing store name"],
  ["stores", "city", "text", "Required", "Store city"],
  ["stores", "province", "text", "Required", "Two-letter Italian province code"],
  ["stores", "format", "text", "Required", "Urban, Supermarket, or Neighborhood"],
  ["stores", "floor_area_sqm", "integer", "Positive", "Sales-floor area in square metres"],
  ["stores", "opening_date", "date", "Required", "Store opening date"],
  ["products", "product_id", "text", "Primary key", "Unique product identifier"],
  ["products", "sku", "text", "Unique", "Stock-keeping unit"],
  ["products", "product_name", "text", "Required", "Product description"],
  ["products", "category", "text", "Required", "Top-level merchandising category"],
  ["products", "subcategory", "text", "Required", "Detailed merchandising category"],
  ["products", "brand_type", "text", "Required", "National, Private Label, or Local"],
  ["products", "supplier_id", "text", "Required", "Supplier identifier"],
  ["products", "unit_cost_eur", "decimal", ">= 0", "Unit acquisition cost in euros"],
  ["products", "list_price_eur", "decimal", ">= 0", "Standard shelf price in euros"],
  ["products", "perishable_flag", "text", "Y/N", "Whether the product has a short shelf life"],
  ["customers", "customer_id", "text", "Primary key expected", "Loyalty customer identifier"],
  ["customers", "loyalty_segment", "text", "Required", "Bronze, Silver, or Gold"],
  ["customers", "age_band", "text", "Optional", "Non-identifying age bracket"],
  ["customers", "city", "text", "Required", "Customer city"],
  ["customers", "signup_date", "date", "Required", "Loyalty signup date"],
  ["customers", "marketing_opt_in", "text", "Y/N", "Permission for promotional contact"],
  ["transactions", "transaction_id", "text", "Primary key expected", "Basket identifier"],
  ["transactions", "transaction_date", "date", "Required", "Purchase date"],
  ["transactions", "transaction_time", "time", "Required", "Purchase time"],
  ["transactions", "store_id", "text", "Foreign key", "Store where basket was purchased"],
  ["transactions", "customer_id", "text", "Nullable foreign key", "Blank means non-loyalty/anonymous customer"],
  ["transactions", "payment_method", "text", "Required", "Raw tender label"],
  ["transactions", "sales_channel", "text", "Required", "Sales channel"],
  ["transactions", "cashier_lane", "integer", "Positive", "Checkout lane number"],
  ["transaction_items", "item_id", "text", "Primary key expected", "Transaction line identifier"],
  ["transaction_items", "transaction_id", "text", "Foreign key", "Parent basket"],
  ["transaction_items", "line_number", "integer", "Positive", "Line order within basket"],
  ["transaction_items", "product_id", "text", "Foreign key", "Purchased product"],
  ["transaction_items", "quantity", "integer", "Non-zero; negative for return", "Units sold or returned"],
  ["transaction_items", "unit_price_eur", "decimal", ">= 0", "Actual unit selling price"],
  ["transaction_items", "discount_pct", "decimal", "0 to 1", "Applied percentage discount"],
  ["transaction_items", "promotion_id", "text", "Nullable foreign key", "Applied campaign, if any"],
  ["transaction_items", "line_type", "text", "SALE/RETURN", "Commercial line type"],
  ["promotions", "promotion_id", "text", "Primary key", "Campaign identifier"],
  ["promotions", "promotion_name", "text", "Required", "Campaign name"],
  ["promotions", "start_date", "date", "Required", "Campaign start"],
  ["promotions", "end_date", "date", ">= start date", "Campaign end"],
  ["promotions", "scope_type", "text", "Required", "CATEGORY, BRAND_TYPE, or PRODUCT"],
  ["promotions", "scope_value", "text", "Required", "Value targeted by the campaign"],
  ["promotions", "planned_discount_pct", "decimal", "0 to 1", "Campaign discount plan"],
  ["promotions", "campaign_channel", "text", "Required", "Promotion communication channel"],
  ["inventory_weekly", "week_start", "date", "Required", "Monday starting the reporting week"],
  ["inventory_weekly", "store_id", "text", "Foreign key", "Store identifier"],
  ["inventory_weekly", "product_id", "text", "Foreign key", "Product identifier"],
  ["inventory_weekly", "opening_stock_units", "integer", ">= 0", "Units at week opening"],
  ["inventory_weekly", "delivered_units", "integer", ">= 0", "Units received during week"],
  ["inventory_weekly", "sold_units", "integer", ">= 0", "Units sold during week"],
  ["inventory_weekly", "waste_units", "integer", ">= 0", "Expired, damaged, or discarded units"],
  ["inventory_weekly", "closing_stock_units", "integer", ">= 0", "Units at week close"],
  ["inventory_weekly", "stockout_days", "integer", "0 to 7", "Days unavailable during week"],
  ["monthly_targets", "month", "date", "First of month", "Target month"],
  ["monthly_targets", "store_id", "text", "Foreign key", "Store identifier"],
  ["monthly_targets", "revenue_target_eur", "decimal", ">= 0", "Net-sales target"],
  ["monthly_targets", "gross_margin_target_pct", "decimal", "0 to 1", "Gross-margin target"],
  ["monthly_targets", "waste_rate_target_pct", "decimal", "0 to 1", "Waste-rate target"],
  ["monthly_targets", "stockout_days_target", "integer", ">= 0", "Monthly stockout-day target"],
];

const auditChecks = [
  ["All", "Confirm row and column counts", "Compare each CSV with the source inventory", "Not started"],
  ["All", "Confirm expected data types", "Check dates, whole numbers, decimals, and text fields", "Not started"],
  ["Master tables", "Check primary-key uniqueness", "COUNTIF or Remove Duplicates preview", "Not started"],
  ["Transactions", "Find duplicate transaction IDs", "COUNTIF transaction_id > 1", "Not started"],
  ["Transaction items", "Find duplicate item IDs", "COUNTIF item_id > 1", "Not started"],
  ["Transactions", "Validate store foreign keys", "XLOOKUP store_id against stores", "Not started"],
  ["Transaction items", "Validate product foreign keys", "XLOOKUP product_id against products", "Not started"],
  ["Transaction items", "Validate transaction foreign keys", "XLOOKUP transaction_id against transactions", "Not started"],
  ["Transaction items", "Test quantity business rule", "Flag zero quantity; review negatives as returns", "Not started"],
  ["Transaction items", "Test discount range", "Flag discount_pct < 0 or > 1", "Not started"],
  ["Products", "Standardize categories and brand types", "TRIM, CLEAN, and case review", "Not started"],
  ["Transactions", "Standardize payment methods", "Create a distinct-value list and mapping", "Not started"],
  ["Inventory", "Reconcile stock movement", "Opening + delivered - sold - waste = closing", "Not started"],
  ["All", "Document nulls as valid or errors", "Count blanks and classify each field", "Not started"],
];

const kpis = [
  ["Net sales", "How much revenue did the chain retain?", "SUM(quantity × unit_price_eur)", "Transaction line", "Returns reduce sales"],
  ["Gross profit", "How much value remains after product cost?", "Net sales - SUM(quantity × unit_cost_eur)", "Transaction line", "Join products for cost"],
  ["Gross margin %", "How profitable is each euro of sales?", "Gross profit / Net sales", "Store, month, category", "Compare with target"],
  ["Transactions", "How many customer baskets were completed?", "DISTINCTCOUNT(transaction_id)", "Store and period", "Exclude true duplicates"],
  ["Average basket value", "What is the average spend per basket?", "Net sales / Transactions", "Store and period", "Use distinct baskets"],
  ["Units per basket", "How large is the average basket?", "Net units / Transactions", "Store and period", "Returns reduce units"],
  ["Promo sales share", "How dependent are sales on promotion?", "Promo net sales / Net sales", "Category and period", "Not the same as uplift"],
  ["Promo margin %", "Do promoted sales remain profitable?", "Promo gross profit / Promo net sales", "Promotion", "Compare non-promo margin"],
  ["Waste rate %", "How much inventory is being lost?", "Waste units / (Opening + Delivered)", "Store, product, week", "Focus on perishables"],
  ["Stockout days", "Where was availability lost?", "SUM(stockout_days)", "Store, product, month", "Lower is better"],
  ["Sales vs target %", "Is each store meeting plan?", "(Net sales - target) / target", "Store and month", "Positive is above plan"],
];

const wb = Workbook.create();
const navy = "#17324D";
const teal = "#0F766E";
const lightTeal = "#DFF5F2";
const sand = "#FFF7E8";
const lightBlue = "#EAF2F8";
const grey = "#6B7280";
const border = "#D1D5DB";

function titleBlock(sheet, title, subtitle, endColumn) {
  sheet.showGridlines = false;
  sheet.mergeCells(`A1:${endColumn}1`);
  sheet.getRange("A1").values = [[title]];
  sheet.getRange(`A1:${endColumn}1`).format = {
    fill: navy,
    font: { bold: true, color: "#FFFFFF", size: 18 },
    rowHeight: 30,
    horizontalAlignment: "left",
    verticalAlignment: "center",
  };
  sheet.mergeCells(`A2:${endColumn}2`);
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange(`A2:${endColumn}2`).format = {
    fill: lightBlue,
    font: { color: navy, italic: true, size: 10 },
    rowHeight: 24,
    wrapText: true,
    verticalAlignment: "center",
  };
}

function styleHeader(range) {
  range.format = {
    fill: teal,
    font: { bold: true, color: "#FFFFFF" },
    horizontalAlignment: "left",
    verticalAlignment: "center",
    wrapText: true,
    rowHeight: 28,
    borders: { bottom: { style: "thin", color: border } },
  };
}

const start = wb.worksheets.add("START_HERE");
titleBlock(start, "MercatoVivo Sicilia | Retail Analytics Consulting Case", "Synthetic portfolio project • Reporting period: 1 Jan–31 Dec 2025 • Start with the business question, then audit the raw data.", "H");
start.getRange("A4:B8").values = [
  ["Client", "MercatoVivo Sicilia (fictional supermarket chain)"],
  ["Your role", "Junior Business Data Analyst supporting a retail consultant"],
  ["Decision", "Where should management act to recover margin without hurting sales?"],
  ["Primary audience", "Commercial Director, Store Operations, Category Managers"],
  ["Important", "The data are synthetic and intentionally contain a few quality issues."],
];
start.getRange("A4:A8").format = { fill: sand, font: { bold: true, color: navy } };
start.getRange("B4:B8").format = { wrapText: true };
start.getRange("A4:B8").format.borders = { bottom: { style: "thin", color: border } };

start.getRange("D4:H4").merge();
start.getRange("D4").values = [["Project completion"]];
start.getRange("D4:H4").format = { fill: navy, font: { bold: true, color: "#FFFFFF" }, horizontalAlignment: "center" };
start.getRange("D5").values = [["Audit checks complete"]];
start.getRange("E5").values = [[0]];
start.getRange("E5").format.numberFormat = "0%";
start.getRange("D6").values = [["Current phase"]];
start.getRange("E6:H6").merge();
start.getRange("E6").values = [["Phase 1 — Excel data audit"]];
start.getRange("D5:D6").format = { fill: lightTeal, font: { bold: true, color: navy } };
start.getRange("E5:H6").format = { font: { bold: true, color: teal }, horizontalAlignment: "center" };

const milestoneRows = [
  ["1", "Business framing", "Write the problem, stakeholders, and success measures", "Ready", "docs/project_brief.md"],
  ["2", "Excel audit", "Profile, validate, and document the raw extracts", "Start here", "workbook/data_audit_starter.xlsx"],
  ["3", "SQL analysis", "Clean, join, and answer business questions", "Locked until audit", "sql/"],
  ["4", "Power BI", "Model the data and build the decision dashboard", "Locked until SQL", "powerbi/"],
  ["5", "Consulting story", "Turn findings into prioritized recommendations", "Locked until dashboard", "docs/"],
  ["6", "Portfolio release", "Polish README, screenshots, and interview story", "Locked until review", "GitHub"],
];
start.getRange("A11:E17").values = [["Phase", "Milestone", "Evidence", "Status", "Location"], ...milestoneRows];
styleHeader(start.getRange("A11:E11"));
start.tables.add("A11:E17", true, "MilestonesTable");
start.getRange("A12:E17").format.wrapText = true;

start.getRange("A20:F20").values = [["Raw file", "Grain", "Expected rows", "Primary key", "Connects to", "First audit question"]];
styleHeader(start.getRange("A20:F20"));
const sourceInventory = [
  ["stores.csv", "One store", stores.length, "store_id", "transactions, inventory, targets", "Are store IDs unique?"],
  ["products.csv", "One product", products.length, "product_id", "items, inventory", "Are category labels consistent?"],
  ["customers.csv", "One loyalty record", customers.length, "customer_id", "transactions", "Are customer IDs unique?"],
  ["promotions.csv", "One campaign", promotions.length, "promotion_id", "transaction_items", "Do date ranges and discounts make sense?"],
  ["transactions.csv", "One basket", transactions.length, "transaction_id", "transaction_items", "Are baskets unique and store IDs valid?"],
  ["transaction_items.csv", "One basket line", transactionItems.length, "item_id", "transactions, products, promotions", "Are quantity and discount valid?"],
  ["inventory_weekly.csv", "Store-product-week", inventoryWeekly.length, "composite", "stores, products", "Does stock movement reconcile?"],
  ["monthly_targets.csv", "Store-month", monthlyTargets.length, "composite", "stores", "Are all 60 store-months present?"],
];
start.getRange(`A21:F${20 + sourceInventory.length}`).values = sourceInventory;
start.tables.add(`A20:F${20 + sourceInventory.length}`, true, "SourceInventoryTable");
start.getRange(`A21:F${20 + sourceInventory.length}`).format.wrapText = true;
start.freezePanes.freezeRows(2);
start.getRange("A1:H30").format.font = { name: "Arial" };
start.getRange("A1:H30").format.verticalAlignment = "center";
start.getRange("A:A").format.columnWidth = 18;
start.getRange("B:B").format.columnWidth = 34;
start.getRange("C:C").format.columnWidth = 28;
start.getRange("D:D").format.columnWidth = 18;
start.getRange("E:E").format.columnWidth = 24;
start.getRange("F:F").format.columnWidth = 34;
start.getRange("G:H").format.columnWidth = 14;

const kpiSheet = wb.worksheets.add("KPI_DEFINITIONS");
titleBlock(kpiSheet, "KPI Definitions", "Agree on business meaning before writing formulas or DAX.", "E");
kpiSheet.getRange(`A5:E${5 + kpis.length}`).values = [["KPI", "Business question", "Definition", "Recommended grain", "Caution"], ...kpis];
styleHeader(kpiSheet.getRange("A5:E5"));
kpiSheet.tables.add(`A5:E${5 + kpis.length}`, true, "KpiDefinitionsTable");
kpiSheet.getRange(`A6:E${5 + kpis.length}`).format.wrapText = true;
kpiSheet.freezePanes.freezeRows(5);
kpiSheet.getRange("A:E").format.font = { name: "Arial" };
kpiSheet.getRange("A:A").format.columnWidth = 22;
kpiSheet.getRange("B:B").format.columnWidth = 34;
kpiSheet.getRange("C:C").format.columnWidth = 42;
kpiSheet.getRange("D:D").format.columnWidth = 24;
kpiSheet.getRange("E:E").format.columnWidth = 30;

const dictionarySheet = wb.worksheets.add("DATA_DICTIONARY");
titleBlock(dictionarySheet, "Data Dictionary", "Use this to understand grain, keys, business rules, and intended joins.", "E");
dictionarySheet.getRange(`A5:E${5 + dictionary.length}`).values = [["Table", "Field", "Type", "Rule", "Business definition"], ...dictionary];
styleHeader(dictionarySheet.getRange("A5:E5"));
dictionarySheet.tables.add(`A5:E${5 + dictionary.length}`, true, "DataDictionaryTable");
dictionarySheet.getRange(`A6:E${5 + dictionary.length}`).format.wrapText = true;
dictionarySheet.freezePanes.freezeRows(5);
dictionarySheet.getRange("A:E").format.font = { name: "Arial" };
dictionarySheet.getRange("A:A").format.columnWidth = 23;
dictionarySheet.getRange("B:B").format.columnWidth = 26;
dictionarySheet.getRange("C:C").format.columnWidth = 15;
dictionarySheet.getRange("D:D").format.columnWidth = 24;
dictionarySheet.getRange("E:E").format.columnWidth = 48;

const audit = wb.worksheets.add("AUDIT_LOG");
titleBlock(audit, "Excel Data Audit Log", "Do not delete questionable rows immediately. Count, classify, decide, and document first.", "G");
audit.getRange("A4:G4").values = [["Table", "Check", "Suggested Excel method", "Your result", "Count", "Decision / cleaning rule", "Status"]];
styleHeader(audit.getRange("A4:G4"));
const auditRows = auditChecks.map(([table, check, method, status]) => [table, check, method, "", "", "", status]);
audit.getRange(`A5:G${4 + auditRows.length}`).values = auditRows;
audit.tables.add(`A4:G${4 + auditRows.length}`, true, "AuditLogTable");
audit.getRange(`G5:G${4 + auditRows.length}`).dataValidation = {
  rule: { type: "list", values: ["Not started", "In progress", "Complete"] },
};
audit.getRange(`G5:G${4 + auditRows.length}`).conditionalFormats.addCustom("=G5=\"Complete\"", { fill: "#DCFCE7", font: { color: "#166534", bold: true } });
audit.getRange(`G5:G${4 + auditRows.length}`).conditionalFormats.addCustom("=G5=\"In progress\"", { fill: "#FEF3C7", font: { color: "#92400E", bold: true } });
audit.getRange(`A5:G${4 + auditRows.length}`).format.wrapText = true;
audit.freezePanes.freezeRows(4);
audit.getRange("A:G").format.font = { name: "Arial" };
audit.getRange("A:A").format.columnWidth = 21;
audit.getRange("B:B").format.columnWidth = 34;
audit.getRange("C:C").format.columnWidth = 40;
audit.getRange("D:D").format.columnWidth = 26;
audit.getRange("E:E").format.columnWidth = 12;
audit.getRange("F:F").format.columnWidth = 38;
audit.getRange("G:G").format.columnWidth = 18;
start.getRange("E5").formulas = [["=COUNTIF(AUDIT_LOG!G5:G18,\"Complete\")/COUNTA(AUDIT_LOG!B5:B18)"]];

const sample = wb.worksheets.add("ITEM_SAMPLE");
titleBlock(sample, "Transaction Item Sample", "A 200-row sample for learning formulas. Audit the complete CSV files before final conclusions.", "I");
const sampleColumns = ["item_id", "transaction_id", "line_number", "product_id", "quantity", "unit_price_eur", "discount_pct", "promotion_id", "line_type"];
sample.getRange("A5:I205").values = [sampleColumns, ...transactionItems.slice(0, 200).map((row) => sampleColumns.map((column) => row[column]))];
styleHeader(sample.getRange("A5:I5"));
sample.tables.add("A5:I205", true, "ItemSampleTable");
sample.freezePanes.freezeRows(5);
sample.getRange("A:I").format.font = { name: "Arial" };
sample.getRange("A:I").format.autofitColumns();
sample.getRange("F:F").format.numberFormat = "€#,##0.00";
sample.getRange("G:G").format.numberFormat = "0%";
sample.getRange("A:A").format.columnWidth = 17;
sample.getRange("B:B").format.columnWidth = 17;

const questions = wb.worksheets.add("BUSINESS_QUESTIONS");
titleBlock(questions, "Consulting Questions", "Your dashboard is successful only if it helps management decide what to do next.", "E");
const businessQuestions = [
  [1, "Performance", "Which stores and months missed revenue and margin targets?", "Store/month variance table", "Executive page"],
  [2, "Profitability", "Which categories grow sales but destroy margin?", "Sales, profit, margin by category", "Category page"],
  [3, "Promotions", "Which campaigns increased volume without adequate margin?", "Promo vs non-promo comparison", "Promotion page"],
  [4, "Operations", "Where do waste and stockouts coexist?", "Waste cost and stockout matrix", "Operations page"],
  [5, "Customers", "Which loyalty segments have the strongest basket value?", "Basket KPIs by segment", "Customer page"],
  [6, "Recommendation", "What three actions should management take first?", "Impact/effort recommendation table", "Executive page"],
];
questions.getRange("A5:E11").values = [["#", "Theme", "Business question", "Required evidence", "Dashboard destination"], ...businessQuestions];
styleHeader(questions.getRange("A5:E5"));
questions.tables.add("A5:E11", true, "BusinessQuestionsTable");
questions.getRange("A6:E11").format.wrapText = true;
questions.getRange("A:E").format.font = { name: "Arial" };
questions.getRange("A:A").format.columnWidth = 6;
questions.getRange("B:B").format.columnWidth = 20;
questions.getRange("C:C").format.columnWidth = 52;
questions.getRange("D:D").format.columnWidth = 34;
questions.getRange("E:E").format.columnWidth = 25;

const workbookPath = path.join(workbookDir, "data_audit_starter.xlsx");
const workbookFile = await SpreadsheetFile.exportXlsx(wb);
await workbookFile.save(workbookPath);

const manifest = {
  generated_at_utc: new Date().toISOString(),
  seed: 20250901,
  reporting_period: { start: "2025-01-01", end: "2025-12-31" },
  synthetic_data: true,
  row_counts: {
    stores: stores.length,
    products: products.length,
    customers: customers.length,
    promotions: promotions.length,
    transactions: transactions.length,
    transaction_items: transactionItems.length,
    inventory_weekly: inventoryWeekly.length,
    monthly_targets: monthlyTargets.length,
  },
};
await fs.writeFile(path.join(projectRoot, "data", "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(JSON.stringify(manifest, null, 2));
