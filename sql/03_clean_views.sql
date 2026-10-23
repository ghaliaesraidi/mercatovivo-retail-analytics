-- MercatoVivo Sicilia
-- Traceable PostgreSQL cleaning layer. Raw tables remain unchanged.

DROP SCHEMA IF EXISTS analytics CASCADE;
CREATE SCHEMA analytics;

CREATE VIEW analytics.dim_date AS
SELECT
    day::date AS date,
    EXTRACT(YEAR FROM day)::integer AS year,
    EXTRACT(QUARTER FROM day)::integer AS quarter,
    EXTRACT(MONTH FROM day)::integer AS month_number,
    TO_CHAR(day, 'Mon') AS month_name,
    DATE_TRUNC('month', day)::date AS month_start,
    EXTRACT(WEEK FROM day)::integer AS week_number
FROM GENERATE_SERIES(DATE '2025-01-01', DATE '2025-12-31', INTERVAL '1 day') AS day;

CREATE VIEW analytics.dim_store AS
SELECT DISTINCT ON (UPPER(TRIM(store_id)))
    UPPER(TRIM(store_id)) AS store_id,
    TRIM(store_name) AS store_name,
    TRIM(city) AS city,
    UPPER(TRIM(province)) AS province,
    TRIM(format) AS format,
    floor_area_sqm,
    opening_date
FROM raw.stores
ORDER BY UPPER(TRIM(store_id)), opening_date;

CREATE VIEW analytics.dim_product AS
SELECT DISTINCT ON (UPPER(TRIM(product_id)))
    UPPER(TRIM(product_id)) AS product_id,
    TRIM(sku) AS sku,
    TRIM(product_name) AS product_name,
    INITCAP(LOWER(TRIM(category))) AS category,
    INITCAP(LOWER(TRIM(subcategory))) AS subcategory,
    INITCAP(LOWER(TRIM(brand_type))) AS brand_type,
    UPPER(TRIM(supplier_id)) AS supplier_id,
    unit_cost_eur,
    list_price_eur,
    UPPER(TRIM(perishable_flag)) AS perishable_flag
FROM raw.products
ORDER BY UPPER(TRIM(product_id)), TRIM(sku);

CREATE VIEW analytics.dim_customer AS
WITH base AS (
    SELECT DISTINCT ON (TRIM(customer_id))
        TRIM(customer_id) AS customer_id,
        INITCAP(LOWER(TRIM(loyalty_segment))) AS loyalty_segment,
        NULLIF(TRIM(age_band), '') AS age_band,
        INITCAP(LOWER(TRIM(city))) AS city,
        signup_date,
        UPPER(TRIM(marketing_opt_in)) AS marketing_opt_in
    FROM raw.customers
    WHERE NULLIF(TRIM(customer_id), '') IS NOT NULL
    ORDER BY TRIM(customer_id), signup_date
)
SELECT * FROM base
UNION ALL
SELECT
    'ANONYMOUS'::text,
    'Anonymous'::text,
    NULL::text,
    NULL::text,
    NULL::date,
    NULL::text;

CREATE VIEW analytics.dim_promotion AS
WITH base AS (
    SELECT DISTINCT ON (TRIM(promotion_id))
        TRIM(promotion_id) AS promotion_id,
        TRIM(promotion_name) AS promotion_name,
        start_date,
        end_date,
        UPPER(TRIM(scope_type)) AS scope_type,
        TRIM(scope_value) AS scope_value,
        planned_discount_pct,
        INITCAP(LOWER(TRIM(campaign_channel))) AS campaign_channel
    FROM raw.promotions
    WHERE NULLIF(TRIM(promotion_id), '') IS NOT NULL
    ORDER BY TRIM(promotion_id), start_date
)
SELECT * FROM base
UNION ALL
SELECT
    'NO_PROMOTION'::text,
    'No promotion'::text,
    NULL::date,
    NULL::date,
    NULL::text,
    NULL::text,
    NULL::numeric,
    NULL::text;

CREATE VIEW analytics.clean_transactions AS
WITH deduplicated AS (
    SELECT DISTINCT ON (TRIM(transaction_id))
        TRIM(transaction_id) AS transaction_id,
        transaction_date,
        transaction_time,
        UPPER(TRIM(store_id)) AS store_id,
        COALESCE(NULLIF(TRIM(customer_id), ''), 'ANONYMOUS') AS customer_id,
        TRIM(payment_method) AS payment_method_raw,
        TRIM(sales_channel) AS sales_channel,
        cashier_lane
    FROM raw.transactions
    WHERE NULLIF(TRIM(transaction_id), '') IS NOT NULL
    ORDER BY TRIM(transaction_id), transaction_date, transaction_time, UPPER(TRIM(store_id))
)
SELECT
    transaction_id,
    transaction_date,
    transaction_time,
    store_id,
    customer_id,
    CASE LOWER(payment_method_raw)
        WHEN 'carta' THEN 'Card'
        WHEN 'contanti' THEN 'Cash'
        WHEN 'mobile' THEN 'Mobile'
        WHEN 'gift card' THEN 'Gift Card'
        ELSE INITCAP(LOWER(payment_method_raw))
    END AS payment_method,
    sales_channel,
    cashier_lane
FROM deduplicated;

CREATE VIEW analytics.transaction_items_deduplicated AS
SELECT DISTINCT ON (TRIM(item_id))
    TRIM(item_id) AS item_id,
    TRIM(transaction_id) AS transaction_id,
    line_number,
    UPPER(NULLIF(TRIM(product_id), '')) AS product_id,
    quantity,
    unit_price_eur,
    discount_pct,
    UPPER(NULLIF(TRIM(promotion_id), '')) AS promotion_id,
    UPPER(TRIM(line_type)) AS line_type
FROM raw.transaction_items
WHERE NULLIF(TRIM(item_id), '') IS NOT NULL
ORDER BY TRIM(item_id), TRIM(transaction_id), line_number;

CREATE VIEW analytics.rejected_transaction_items AS
SELECT
    i.*,
    CASE
        WHEN i.quantity = 0 THEN 'ZERO_QUANTITY'
        WHEN i.discount_pct < 0 OR i.discount_pct > 1 THEN 'DISCOUNT_OUT_OF_RANGE'
        WHEN i.product_id IS NULL THEN 'MISSING_PRODUCT_ID'
        WHEN p.product_id IS NULL THEN 'UNMATCHED_PRODUCT_ID'
        WHEN t.transaction_id IS NULL THEN 'UNMATCHED_TRANSACTION_ID'
    END AS rejection_reason
FROM analytics.transaction_items_deduplicated i
LEFT JOIN analytics.dim_product p
    ON i.product_id = p.product_id
LEFT JOIN analytics.clean_transactions t
    ON i.transaction_id = t.transaction_id
WHERE i.quantity = 0
   OR i.discount_pct < 0
   OR i.discount_pct > 1
   OR i.product_id IS NULL
   OR p.product_id IS NULL
   OR t.transaction_id IS NULL;

CREATE VIEW analytics.fact_sales AS
SELECT
    i.item_id,
    i.transaction_id,
    i.line_number,
    t.transaction_date,
    DATE_TRUNC('month', t.transaction_date)::date AS month_start,
    t.store_id,
    t.customer_id,
    i.product_id,
    COALESCE(i.promotion_id, 'NO_PROMOTION') AS promotion_id,
    i.line_type,
    i.quantity,
    i.unit_price_eur,
    i.discount_pct,
    p.unit_cost_eur,
    i.quantity * i.unit_price_eur AS net_sales_eur,
    i.quantity * p.unit_cost_eur AS product_cost_eur,
    i.quantity * (i.unit_price_eur - p.unit_cost_eur) AS gross_profit_eur
FROM analytics.transaction_items_deduplicated i
JOIN analytics.clean_transactions t
    ON i.transaction_id = t.transaction_id
JOIN analytics.dim_store s
    ON t.store_id = s.store_id
JOIN analytics.dim_product p
    ON i.product_id = p.product_id
WHERE i.quantity <> 0
  AND i.discount_pct BETWEEN 0 AND 1;

CREATE VIEW analytics.fact_inventory AS
SELECT
    i.week_start,
    UPPER(TRIM(i.store_id)) AS store_id,
    UPPER(TRIM(i.product_id)) AS product_id,
    i.opening_stock_units,
    i.delivered_units,
    i.sold_units,
    i.waste_units,
    i.closing_stock_units,
    i.stockout_days,
    i.waste_units * p.unit_cost_eur AS waste_cost_eur,
    i.opening_stock_units + i.delivered_units - i.sold_units - i.waste_units = i.closing_stock_units AS reconciles
FROM raw.inventory_weekly i
JOIN analytics.dim_store s
    ON UPPER(TRIM(i.store_id)) = s.store_id
JOIN analytics.dim_product p
    ON UPPER(TRIM(i.product_id)) = p.product_id;

CREATE VIEW analytics.fact_targets AS
SELECT
    t.month AS month_start,
    UPPER(TRIM(t.store_id)) AS store_id,
    t.revenue_target_eur,
    t.gross_margin_target_pct,
    t.waste_rate_target_pct,
    t.stockout_days_target
FROM raw.monthly_targets t
JOIN analytics.dim_store s
    ON UPPER(TRIM(t.store_id)) = s.store_id;

-- Reconciliation controls used before downstream analysis.
SELECT COUNT(*) AS clean_transactions FROM analytics.clean_transactions;
SELECT COUNT(*) AS clean_sales_lines FROM analytics.fact_sales;
SELECT rejection_reason, COUNT(*) AS rejected_rows
FROM analytics.rejected_transaction_items
GROUP BY rejection_reason
ORDER BY rejection_reason;

