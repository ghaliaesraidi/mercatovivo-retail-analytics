# SQL Phase

**Dialect:** PostgreSQL 16-compatible SQL.

The raw schema intentionally has no primary-key or foreign-key constraints. This allows the original defects to load unchanged so they can be measured before cleaning.

## Order

1. Run `00_create_raw_tables.sql`.
2. Import each CSV from `data/raw/` with header names enabled.
3. Run and complete `01_data_quality_exercises.sql`.
4. Agree cleaning decisions before creating clean views.
5. Complete `02_business_analysis_exercises.sql`.

## Import order

1. `stores.csv`
2. `products.csv`
3. `customers.csv`
4. `promotions.csv`
5. `transactions.csv`
6. `transaction_items.csv`
7. `inventory_weekly.csv`
8. `monthly_targets.csv`

Use pgAdmin's Import/Export Data dialog if you are new to PostgreSQL. Choose comma delimiter, UTF-8 encoding, and enable Header. Do not add constraints until the audit is complete.

