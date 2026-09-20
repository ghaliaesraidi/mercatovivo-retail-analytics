# Power BI Build Specification

Begin this phase only after SQL quality checks and KPI reconciliation are complete.

## Model

- Build the star schema in [`docs/data_model.md`](../docs/data_model.md).
- Create a continuous date table and mark it as a date table.
- Use one-directional one-to-many relationships from dimensions to facts.
- Hide technical keys from report view after validation.
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

## Reconciliation tests

- Power BI total net sales equals the accepted SQL total.
- Store totals sum to chain total for additive measures.
- Distinct transaction count is not multiplied by item joins.
- Margin percentage is calculated from aggregated profit and sales, not averaged row percentages.
- Target percentages behave correctly across months and stores.

