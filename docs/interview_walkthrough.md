# Interview walkthrough

## 90-second project explanation

“I built a retail analytics case for a fictional five-store supermarket chain. The business question was where management should act first to recover margin without hurting sales or product availability. I began by auditing eight raw CSV files in Excel and PostgreSQL because the data intentionally contained duplicate keys, inconsistent labels, missing product keys, and invalid quantities and discounts.

I kept the raw layer unchanged, documented each cleaning rule, and created clean analytical views at basket-line grain. I then calculated sales, gross profit, margin, target variance, promotion performance, waste, and stockouts. The strongest finding was that Lentini combined the largest target shortfall with the highest waste and all recorded stockout days. Promotions also had an 11.1 percentage-point lower margin than non-promotion lines, so I recommended margin gates and better testing rather than assuming promotions create uplift.”

## Questions to be ready for

### What is the grain?

- `transactions`: one basket.
- `transaction_items`: one product line inside a basket.
- `fact_sales`: one valid, deduplicated basket line.
- `inventory_weekly`: one store × product × week.
- `monthly_targets`: one store × month.

### Why remove duplicate items before calculating sales?

Each duplicated `item_id` repeats the same commercial event. Keeping both copies would double-count its units, sales, and profit.

### Why standardize keys before validating them?

Five store keys were valid IDs written in lowercase. An exact join treats `mv001` and `MV001` as different values. `UPPER(TRIM(store_id))` fixes the format; the next validation confirms the standardized value exists in the store dimension.

### Why quarantine invalid rows instead of correcting them?

The four blank product IDs cannot be assigned safely without source evidence. The zero quantities and discounts above 100% also violate agreed rules. Quarantining keeps the issue visible and prevents unsupported guesses.

### Why is promotion performance not causal uplift?

Promo and non-promo lines may differ by product, season, store, and customer demand. A causal conclusion needs a valid comparison group or experiment, not only a margin comparison.

### What SQL concepts does the project demonstrate?

- `SELECT`, `WHERE`, `CASE`, `GROUP BY`, and `HAVING`
- `INNER JOIN` and `LEFT JOIN`
- Common table expressions
- `ROW_NUMBER()` and ranking window functions
- Conditional aggregation and distinct counts
- Data-quality checks and reusable analytical views

### What would you build next?

Build the Power BI semantic model from the clean views, recreate the four-page dashboard specification, reconcile every headline KPI to SQL, and test the three recommendations with monthly monitoring.

