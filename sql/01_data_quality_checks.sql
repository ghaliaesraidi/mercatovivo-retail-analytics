-- MercatoVivo Sicilia
-- Completed PostgreSQL audit checks. Run after loading the eight raw tables.

-- 1. Row counts
SELECT 'stores' AS table_name, COUNT(*) AS row_count FROM raw.stores
UNION ALL SELECT 'products', COUNT(*) FROM raw.products
UNION ALL SELECT 'customers', COUNT(*) FROM raw.customers
UNION ALL SELECT 'promotions', COUNT(*) FROM raw.promotions
UNION ALL SELECT 'transactions', COUNT(*) FROM raw.transactions
UNION ALL SELECT 'transaction_items', COUNT(*) FROM raw.transaction_items
UNION ALL SELECT 'inventory_weekly', COUNT(*) FROM raw.inventory_weekly
UNION ALL SELECT 'monthly_targets', COUNT(*) FROM raw.monthly_targets
ORDER BY table_name;

-- 2. Duplicate customer IDs
SELECT customer_id, COUNT(*) AS row_count
FROM raw.customers
GROUP BY customer_id
HAVING COUNT(*) > 1
ORDER BY customer_id;

-- 3. Duplicate transaction IDs
SELECT transaction_id, COUNT(*) AS row_count
FROM raw.transactions
GROUP BY transaction_id
HAVING COUNT(*) > 1
ORDER BY transaction_id;

-- 4. Duplicate item IDs
SELECT item_id, COUNT(*) AS row_count
FROM raw.transaction_items
GROUP BY item_id
HAVING COUNT(*) > 1
ORDER BY item_id;

-- 5. Store foreign-key failures before and after standardization
SELECT
    COUNT(*) FILTER (WHERE s_exact.store_id IS NULL) AS exact_match_failures,
    COUNT(*) FILTER (WHERE s_clean.store_id IS NULL) AS failures_after_standardization
FROM raw.transactions t
LEFT JOIN raw.stores s_exact
    ON t.store_id = s_exact.store_id
LEFT JOIN raw.stores s_clean
    ON UPPER(TRIM(t.store_id)) = UPPER(TRIM(s_clean.store_id));

-- 6. Product foreign-key failures. Blank keys are counted separately.
SELECT
    COUNT(*) FILTER (WHERE NULLIF(TRIM(i.product_id), '') IS NULL) AS blank_product_keys,
    COUNT(*) FILTER (
        WHERE NULLIF(TRIM(i.product_id), '') IS NOT NULL
          AND p.product_id IS NULL
    ) AS unmatched_nonblank_product_keys
FROM raw.transaction_items i
LEFT JOIN raw.products p
    ON UPPER(TRIM(i.product_id)) = UPPER(TRIM(p.product_id));

-- 7. Transaction foreign-key failures
SELECT COUNT(*) AS unmatched_transaction_rows
FROM raw.transaction_items i
LEFT JOIN raw.transactions t
    ON i.transaction_id = t.transaction_id
WHERE t.transaction_id IS NULL;

-- 8. Quantity checks
SELECT
    COUNT(*) FILTER (WHERE quantity = 0) AS zero_quantity_rows,
    COUNT(*) FILTER (WHERE quantity < 0) AS negative_quantity_rows,
    COUNT(*) FILTER (WHERE quantity < 0 AND line_type <> 'RETURN') AS negative_not_marked_return
FROM raw.transaction_items;

-- 9. Discount range
SELECT COUNT(*) AS invalid_discount_rows
FROM raw.transaction_items
WHERE discount_pct < 0 OR discount_pct > 1;

-- 10. Product label consistency
SELECT
    category AS raw_category,
    INITCAP(LOWER(TRIM(category))) AS standardized_category,
    COUNT(*) AS products
FROM raw.products
GROUP BY category, INITCAP(LOWER(TRIM(category)))
ORDER BY standardized_category, raw_category;

SELECT
    brand_type AS raw_brand_type,
    INITCAP(LOWER(TRIM(brand_type))) AS standardized_brand_type,
    COUNT(*) AS products
FROM raw.products
GROUP BY brand_type, INITCAP(LOWER(TRIM(brand_type)))
ORDER BY standardized_brand_type, raw_brand_type;

-- 11. Payment-method consistency
SELECT payment_method, COUNT(*) AS transactions
FROM raw.transactions
GROUP BY payment_method
ORDER BY transactions DESC, payment_method;

-- 12. Inventory reconciliation
SELECT COUNT(*) AS reconciliation_failures
FROM raw.inventory_weekly
WHERE opening_stock_units + delivered_units - sold_units - waste_units <> closing_stock_units;

-- 13. Candidate-key controls
SELECT
    (SELECT COUNT(*) - COUNT(DISTINCT store_id) FROM raw.stores) AS excess_store_rows,
    (SELECT COUNT(*) - COUNT(DISTINCT product_id) FROM raw.products) AS excess_product_rows,
    (SELECT COUNT(*) - COUNT(DISTINCT customer_id) FROM raw.customers) AS excess_customer_rows,
    (SELECT COUNT(*) - COUNT(DISTINCT promotion_id) FROM raw.promotions) AS excess_promotion_rows,
    (SELECT COUNT(*) - COUNT(DISTINCT transaction_id) FROM raw.transactions) AS excess_transaction_rows,
    (SELECT COUNT(*) - COUNT(DISTINCT item_id) FROM raw.transaction_items) AS excess_item_rows,
    (SELECT COUNT(*) - COUNT(DISTINCT (week_start, store_id, product_id)) FROM raw.inventory_weekly) AS excess_inventory_rows,
    (SELECT COUNT(*) - COUNT(DISTINCT (month, store_id)) FROM raw.monthly_targets) AS excess_target_rows;

