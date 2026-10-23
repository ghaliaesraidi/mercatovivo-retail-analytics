# Power BI build specification

**Status:** semantic-model and dashboard specification complete; `.pbix` not included.

The validated SQL outputs and static dashboard preview define the expected Power BI results. Build the report only from the `analytics` views created by `sql/03_clean_views.sql`, then reconcile each headline measure to `output/analysis_results.json`.

## Model

- Use the star schema in [`docs/data_model.md`](../docs/data_model.md).
- Create a continuous date table and mark it as a date table.
- Use one-directional, one-to-many relationships from dimensions to facts.
- Keep `fact_sales`, `fact_inventory`, and `fact_targets` separate.
- Hide technical keys after validating every relationship.
- Put explicit DAX measures in a dedicated measure table.

## Required measures

- Net Sales
- Product Cost
- Gross Profit
- Gross Margin %
- Transactions
- Net Units
- Average Basket Value
- Units per Basket
- Promo Sales
- Promo Sales Share %
- Promo Margin %
- Revenue Target
- Sales Variance EUR
- Sales Variance %
- Waste Units
- Waste Cost
- Waste Rate %
- Stockout Days

## Pages

Follow [`docs/dashboard_brief.md`](../docs/dashboard_brief.md):

1. Executive overview
2. Store and category performance
3. Promotions and customers
4. Waste and availability

## Reconciliation controls

- Net Sales = €115,031.05
- Gross Profit = €53,360.74
- Gross Margin = 46.39%
- Transactions = 12,000
- Net Units = 46,318
- Average Basket Value = €9.59

Store totals must sum to the chain total for additive measures. Distinct transaction count must not be multiplied by item joins. Margin percentage must use aggregated profit divided by aggregated sales rather than an average of row-level percentages.

