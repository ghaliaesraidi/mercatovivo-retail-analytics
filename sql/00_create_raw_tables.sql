-- MercatoVivo Sicilia
-- PostgreSQL raw landing tables: preserve source values exactly enough to audit them.

DROP SCHEMA IF EXISTS raw CASCADE;
CREATE SCHEMA raw;

CREATE TABLE raw.stores (
    store_id           text,
    store_name         text,
    city               text,
    province           text,
    format             text,
    floor_area_sqm     integer,
    opening_date       date
);

CREATE TABLE raw.products (
    product_id         text,
    sku                text,
    product_name       text,
    category           text,
    subcategory        text,
    brand_type         text,
    supplier_id        text,
    unit_cost_eur      numeric(10,2),
    list_price_eur     numeric(10,2),
    perishable_flag    text
);

CREATE TABLE raw.customers (
    customer_id        text,
    loyalty_segment    text,
    age_band           text,
    city               text,
    signup_date        date,
    marketing_opt_in   text
);

CREATE TABLE raw.promotions (
    promotion_id          text,
    promotion_name        text,
    start_date            date,
    end_date              date,
    scope_type            text,
    scope_value           text,
    planned_discount_pct  numeric(8,4),
    campaign_channel      text
);

CREATE TABLE raw.transactions (
    transaction_id     text,
    transaction_date   date,
    transaction_time   time,
    store_id            text,
    customer_id         text,
    payment_method      text,
    sales_channel       text,
    cashier_lane        integer
);

CREATE TABLE raw.transaction_items (
    item_id             text,
    transaction_id      text,
    line_number         integer,
    product_id          text,
    quantity            integer,
    unit_price_eur      numeric(10,2),
    discount_pct        numeric(8,4),
    promotion_id        text,
    line_type           text
);

CREATE TABLE raw.inventory_weekly (
    week_start          date,
    store_id            text,
    product_id          text,
    opening_stock_units integer,
    delivered_units     integer,
    sold_units          integer,
    waste_units         integer,
    closing_stock_units integer,
    stockout_days       integer
);

CREATE TABLE raw.monthly_targets (
    month                    date,
    store_id                 text,
    revenue_target_eur       numeric(14,2),
    gross_margin_target_pct  numeric(8,4),
    waste_rate_target_pct    numeric(8,4),
    stockout_days_target     integer
);

