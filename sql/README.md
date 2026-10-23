# SQL analysis

**Dialect:** PostgreSQL 16-compatible SQL.

The raw schema intentionally has no primary-key or foreign-key constraints. This allows the source defects to load unchanged, be counted, and receive an explicit treatment before analysis.

## Run order

1. Run `00_create_raw_tables.sql`.
2. Import the eight CSV files from `data/raw/` using UTF-8, comma delimiter, and header row.
3. Run `01_data_quality_checks.sql` and compare the results with `docs/audit_findings.md`.
4. Run `03_clean_views.sql` to create the `analytics` schema.
5. Run `04_business_analysis.sql` for the portfolio result tables.

The original `01_data_quality_exercises.sql` and `02_business_analysis_exercises.sql` remain available as learning prompts.

## Cleaning principles

- Keep the `raw` schema unchanged.
- Remove only confirmed duplicate events in the analytical layer.
- Standardize formatting before validating keys.
- Quarantine unsupported values instead of guessing replacements.
- Count transactions distinctly after joining to basket lines.
- Calculate margin from aggregated profit divided by aggregated sales.
- Reconcile downstream totals to saved SQL outputs.

## Import order

1. `stores.csv`
2. `products.csv`
3. `customers.csv`
4. `promotions.csv`
5. `transactions.csv`
6. `transaction_items.csv`
7. `inventory_weekly.csv`
8. `monthly_targets.csv`

