# Data quality findings

## Audit scope

The audit covers all eight raw CSV extracts for the 2025 reporting period. Raw files remain unchanged. Cleaning rules are applied in the analytical layer so every exclusion and standardization is traceable.

## Source inventory

| Table | Raw rows | Grain |
|---|---:|---|
| Stores | 5 | One store |
| Products | 40 | One product |
| Customers | 902 | One loyalty record |
| Promotions | 14 | One campaign |
| Transactions | 12,002 | One basket |
| Transaction items | 37,270 | One basket line |
| Inventory weekly | 10,600 | Store × product × week |
| Monthly targets | 60 | Store × month |

## Confirmed issues and decisions

| Check | Result | Cleaning decision |
|---|---|---|
| Customer primary key | 2 duplicate IDs (`CU0122`, `CU0489`), 4 affected rows, 2 excess rows | Keep one copy of each identical record in the customer dimension. Preserve raw rows. |
| Transaction primary key | 2 duplicate IDs (`TX000251`, `TX007100`), 4 affected rows, 2 excess rows | Keep one copy of each identical basket before counting transactions. |
| Item primary key | 12 duplicate item IDs, 24 affected rows, 12 excess rows | Keep one copy of each identical line before calculating sales or units. |
| Store foreign key | 5 transaction rows fail an exact match because the key is lowercase | Standardize with `UPPER(TRIM(store_id))`; all five then match a valid store. |
| Product foreign key | 4 item rows have a blank `product_id` | Quarantine these rows until the source key is corrected. Do not assign a product by guessing. |
| Transaction foreign key | 0 unmatched item rows after transaction deduplication | No treatment required. |
| Quantity rule | 4 item rows have zero quantity | Quarantine zero-quantity rows. Negative quantities remain valid when `line_type = 'RETURN'`. |
| Discount range | 3 rows have `discount_pct = 1.25` | Quarantine values outside 0–1 instead of silently capping them. |
| Product labels | `Bakery `, `fresh produce`, and `national` are inconsistent | Apply `TRIM` and consistent title case in the product dimension. |
| Payment labels | `carta`, `Contanti `, `MOBILE`, and `gift card` are inconsistent | Map them to Card, Cash, Mobile, and Gift Card. |
| Inventory equation | 0 failures across 10,600 rows | Accept rows where opening + delivered − sold − waste = closing. |

## Clean analytical population

After applying the accepted rules:

- 12,000 distinct transactions remain.
- 37,247 valid transaction lines remain.
- 900 distinct loyalty customers remain, plus an `Anonymous` reporting member for blank customer IDs.
- All retained store, product, and transaction foreign keys resolve.

## Business-rule interpretation

- A blank `customer_id` is a valid anonymous purchase, not automatically an error.
- A blank `promotion_id` means no promotion was applied.
- A negative quantity is a return when the matching `line_type` is `RETURN`.
- Promotion sales share is descriptive. It does not establish causal uplift.
- The supplied transactions are a teaching extract, so monetary totals are described as totals in the supplied extract rather than total company turnover.

## Reproducibility

The PostgreSQL checks are in [`sql/01_data_quality_checks.sql`](../sql/01_data_quality_checks.sql). Cleaning views are in [`sql/03_clean_views.sql`](../sql/03_clean_views.sql). The independent validation script writes the summary tables used by the portfolio dashboard.

