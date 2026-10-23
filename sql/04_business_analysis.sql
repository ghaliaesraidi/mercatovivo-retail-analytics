-- MercatoVivo Sicilia
-- Portfolio analysis queries built on the validated analytics schema.

-- Q1. Monthly chain performance
SELECT
    month_start,
    ROUND(SUM(net_sales_eur), 2) AS net_sales_eur,
    ROUND(SUM(gross_profit_eur), 2) AS gross_profit_eur,
    ROUND(SUM(gross_profit_eur) / NULLIF(SUM(net_sales_eur), 0), 4) AS gross_margin_pct,
    COUNT(DISTINCT transaction_id) AS transactions,
    ROUND(SUM(net_sales_eur) / NULLIF(COUNT(DISTINCT transaction_id), 0), 2) AS average_basket_eur,
    SUM(quantity) AS net_units
FROM analytics.fact_sales
GROUP BY month_start
ORDER BY month_start;

-- Q2. Store performance versus plan
WITH actual AS (
    SELECT
        store_id,
        month_start,
        SUM(net_sales_eur) AS net_sales_eur
    FROM analytics.fact_sales
    GROUP BY store_id, month_start
)
SELECT
    s.store_name,
    t.month_start,
    ROUND(a.net_sales_eur, 2) AS net_sales_eur,
    t.revenue_target_eur,
    ROUND(a.net_sales_eur - t.revenue_target_eur, 2) AS variance_eur,
    ROUND((a.net_sales_eur - t.revenue_target_eur) / NULLIF(t.revenue_target_eur, 0), 4) AS variance_pct
FROM analytics.fact_targets t
JOIN actual a
    ON t.store_id = a.store_id
   AND t.month_start = a.month_start
JOIN analytics.dim_store s
    ON t.store_id = s.store_id
ORDER BY t.month_start, s.store_name;

-- Q3. Category profitability and rank
WITH category_result AS (
    SELECT
        p.category,
        SUM(f.net_sales_eur) AS net_sales_eur,
        SUM(f.gross_profit_eur) AS gross_profit_eur
    FROM analytics.fact_sales f
    JOIN analytics.dim_product p USING (product_id)
    GROUP BY p.category
)
SELECT
    category,
    ROUND(net_sales_eur, 2) AS net_sales_eur,
    ROUND(gross_profit_eur, 2) AS gross_profit_eur,
    ROUND(gross_profit_eur / NULLIF(net_sales_eur, 0), 4) AS gross_margin_pct,
    DENSE_RANK() OVER (ORDER BY net_sales_eur DESC) AS sales_rank,
    DENSE_RANK() OVER (ORDER BY gross_profit_eur DESC) AS profit_rank
FROM category_result
ORDER BY sales_rank;

-- Q4. Store-category combinations with meaningful sales and below-chain margin
WITH chain AS (
    SELECT SUM(gross_profit_eur) / NULLIF(SUM(net_sales_eur), 0) AS chain_margin
    FROM analytics.fact_sales
), store_category AS (
    SELECT
        f.store_id,
        p.category,
        SUM(f.net_sales_eur) AS net_sales_eur,
        SUM(f.gross_profit_eur) AS gross_profit_eur
    FROM analytics.fact_sales f
    JOIN analytics.dim_product p USING (product_id)
    GROUP BY f.store_id, p.category
)
SELECT
    s.store_name,
    sc.category,
    ROUND(sc.net_sales_eur, 2) AS net_sales_eur,
    ROUND(sc.gross_profit_eur / NULLIF(sc.net_sales_eur, 0), 4) AS gross_margin_pct,
    ROUND((sc.gross_profit_eur / NULLIF(sc.net_sales_eur, 0) - c.chain_margin) * 100, 2) AS margin_gap_vs_chain_pp
FROM store_category sc
CROSS JOIN chain c
JOIN analytics.dim_store s USING (store_id)
WHERE sc.net_sales_eur >= 1000
  AND sc.gross_profit_eur / NULLIF(sc.net_sales_eur, 0) < c.chain_margin
ORDER BY gross_margin_pct, net_sales_eur DESC;

-- Q5. Promotion performance. This is descriptive and does not prove causal uplift.
SELECT
    pr.promotion_name,
    ROUND(SUM(f.net_sales_eur), 2) AS net_sales_eur,
    SUM(f.quantity) AS net_units,
    ROUND(SUM(f.gross_profit_eur), 2) AS gross_profit_eur,
    ROUND(SUM(f.gross_profit_eur) / NULLIF(SUM(f.net_sales_eur), 0), 4) AS gross_margin_pct,
    ROUND(AVG(f.discount_pct), 4) AS average_line_discount_pct
FROM analytics.fact_sales f
JOIN analytics.dim_promotion pr USING (promotion_id)
WHERE f.promotion_id <> 'NO_PROMOTION'
GROUP BY pr.promotion_name
ORDER BY net_sales_eur DESC;

-- Q6. Loyalty segments, including valid anonymous baskets
SELECT
    c.loyalty_segment,
    COUNT(DISTINCT f.transaction_id) AS transactions,
    ROUND(SUM(f.net_sales_eur), 2) AS net_sales_eur,
    ROUND(SUM(f.net_sales_eur) / NULLIF(COUNT(DISTINCT f.transaction_id), 0), 2) AS average_basket_eur,
    ROUND(SUM(f.quantity)::numeric / NULLIF(COUNT(DISTINCT f.transaction_id), 0), 2) AS units_per_basket
FROM analytics.fact_sales f
JOIN analytics.dim_customer c USING (customer_id)
GROUP BY c.loyalty_segment
ORDER BY net_sales_eur DESC;

-- Q7. Waste and stockouts by store and category
SELECT
    s.store_name,
    p.category,
    SUM(i.waste_units) AS waste_units,
    ROUND(SUM(i.waste_cost_eur), 2) AS waste_cost_eur,
    ROUND(SUM(i.waste_units)::numeric / NULLIF(SUM(i.opening_stock_units + i.delivered_units), 0), 4) AS waste_rate_pct,
    SUM(i.stockout_days) AS stockout_days
FROM analytics.fact_inventory i
JOIN analytics.dim_store s USING (store_id)
JOIN analytics.dim_product p USING (product_id)
GROUP BY s.store_name, p.category
ORDER BY waste_cost_eur DESC, stockout_days DESC;

-- Q8. Ten products with the lowest margin among products with at least EUR 1,000 sales
SELECT
    p.product_id,
    p.product_name,
    p.category,
    ROUND(SUM(f.net_sales_eur), 2) AS net_sales_eur,
    ROUND(SUM(f.gross_profit_eur), 2) AS gross_profit_eur,
    ROUND(SUM(f.gross_profit_eur) / NULLIF(SUM(f.net_sales_eur), 0), 4) AS gross_margin_pct
FROM analytics.fact_sales f
JOIN analytics.dim_product p USING (product_id)
GROUP BY p.product_id, p.product_name, p.category
HAVING SUM(f.net_sales_eur) >= 1000
ORDER BY gross_margin_pct, net_sales_eur DESC
LIMIT 10;

-- Q9. Monthly store ranking by gross profit
WITH monthly_store AS (
    SELECT
        month_start,
        store_id,
        SUM(gross_profit_eur) AS gross_profit_eur
    FROM analytics.fact_sales
    GROUP BY month_start, store_id
)
SELECT
    month_start,
    s.store_name,
    ROUND(gross_profit_eur, 2) AS gross_profit_eur,
    DENSE_RANK() OVER (PARTITION BY month_start ORDER BY gross_profit_eur DESC) AS gross_profit_rank
FROM monthly_store ms
JOIN analytics.dim_store s USING (store_id)
ORDER BY month_start, gross_profit_rank;

-- Q10. Compact recommendation evidence table by store
WITH sales AS (
    SELECT
        store_id,
        SUM(net_sales_eur) AS net_sales_eur,
        SUM(gross_profit_eur) / NULLIF(SUM(net_sales_eur), 0) AS gross_margin_pct
    FROM analytics.fact_sales
    GROUP BY store_id
), targets AS (
    SELECT store_id, SUM(revenue_target_eur) AS revenue_target_eur
    FROM analytics.fact_targets
    GROUP BY store_id
), inventory AS (
    SELECT
        store_id,
        SUM(waste_units)::numeric / NULLIF(SUM(opening_stock_units + delivered_units), 0) AS waste_rate_pct,
        SUM(stockout_days) AS stockout_days
    FROM analytics.fact_inventory
    GROUP BY store_id
)
SELECT
    st.store_name,
    ROUND(sa.net_sales_eur, 2) AS net_sales_eur,
    ROUND((sa.net_sales_eur - t.revenue_target_eur) / NULLIF(t.revenue_target_eur, 0), 4) AS sales_variance_pct,
    ROUND(sa.gross_margin_pct, 4) AS gross_margin_pct,
    ROUND(i.waste_rate_pct, 4) AS waste_rate_pct,
    i.stockout_days
FROM sales sa
JOIN targets t USING (store_id)
JOIN inventory i USING (store_id)
JOIN analytics.dim_store st USING (store_id)
ORDER BY sales_variance_pct;

