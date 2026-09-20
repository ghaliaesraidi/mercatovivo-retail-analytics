# Consulting Project Brief

## Client

MercatoVivo Sicilia is a fictional five-store supermarket chain serving Catania, Siracusa, Ragusa, Lentini, and Palermo.

## Your role

You are the junior Business Data Analyst assigned to support a retail-consulting engagement. You report to the engagement manager and will present to the Commercial Director, Store Operations Manager, and Category Managers.

## Situation

Management believes sales performance is uneven and that recent promotional activity may be protecting revenue at the expense of margin. Store teams also report waste in fresh categories and recurring product-availability problems.

The existing information is split across point-of-sale, product, customer, promotion, inventory, and target files. Management does not yet trust that the extracts are clean enough for decision-making.

## The client request

> Build a reliable view of 2025 commercial performance. Identify the stores, categories, products, and promotions that require action. Explain the relationship between sales, gross margin, waste, stockouts, and plan variance. Recommend three actions management can take during the next quarter.

## Decisions the work must support

1. Which store/category combinations deserve immediate margin intervention?
2. Which promotions should be repeated, changed, or stopped?
3. Where can waste be reduced without increasing stockouts?
4. Which loyalty segments deserve focused commercial attention?
5. What should management monitor every month?

## Required deliverables

1. Completed Excel data-audit log
2. SQL cleaning layer and documented quality checks
3. SQL analysis answering the agreed business questions
4. Power BI semantic model and four-page dashboard
5. One-page executive recommendation memo
6. GitHub README with screenshots, findings, methods, and limitations

## Success criteria

- Every KPI has one documented definition.
- Raw data remain unchanged and reproducible.
- Cleaning decisions are traceable.
- Joins do not silently multiply revenue or transactions.
- Dashboard totals reconcile with SQL outputs.
- Recommendations name an owner, action, expected business effect, and monitoring KPI.
- Limitations are stated honestly.

## Scope

### Included

- 2025 in-store transactions
- Store, product, and loyalty-customer dimensions
- Promotion exposure recorded at basket-line level
- Weekly inventory, waste, and stockout information
- Monthly store targets

### Excluded

- Staff scheduling and payroll
- Supplier lead-time detail
- Online orders
- Customer names or direct personal data
- True causal promotion uplift modelling
- Forecasting beyond a simple optional extension

## Important analytical cautions

- The supplied transactions are a teaching sample rather than the chain's complete POS volume; describe absolute totals as extract totals.
- A blank `customer_id` normally means an anonymous purchase, not automatically an error.
- Negative quantity can represent a return; use `line_type` to interpret it.
- Promotion sales share is not the same as causal uplift.
- High sales with poor margin may be worse than moderate but profitable growth.
- Low waste can coexist with damaging stockouts, so never optimize waste alone.

## Working hypothesis—not a conclusion

Margin pressure may be concentrated in a few store/category combinations rather than across the entire chain. This hypothesis must be tested; it must not be presented as a finding until the cleaned data support it.
