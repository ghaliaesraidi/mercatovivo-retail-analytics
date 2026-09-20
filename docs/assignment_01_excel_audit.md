# Assignment 1 — Excel Data Audit

**Time box:** 60–90 minutes  
**Goal:** Understand the files and detect evidence of quality problems before cleaning anything.

## What to open

- `workbook/data_audit_starter.xlsx`
- All files in `data/raw/`
- `docs/project_brief.md`

## Part A — Explain the case

Write three sentences in your own words:

1. What problem is management trying to solve?
2. Who will use the result?
3. What decision should the dashboard improve?

Do not mention Excel, SQL, or Power BI in these sentences.

## Part B — Inventory the data

In the workbook's `AUDIT_LOG`, complete these checks first:

1. Row and column counts
2. Expected data types
3. Primary-key uniqueness
4. Duplicate transaction IDs
5. Duplicate item IDs
6. Valid store foreign keys

For each check, fill in:

- `Your result`
- `Count`
- `Decision / cleaning rule`
- `Status`

## Suggested Excel methods

Use Excel Tables or Power Query. Useful functions include:

```excel
=ROWS(TableName)
=COUNTA(TableName[transaction_id])
=COUNTIF(TableName[transaction_id],[@transaction_id])
=XLOOKUP([@store_id],Stores[store_id],Stores[store_id],"NOT FOUND")
=TRIM([@category])
```

Do not paste these blindly. Replace table and column names with the names in your workbook.

## Part C — Answer these questions

1. Does every blank mean an error? Give one example.
2. Is every negative quantity an error? Which field helps you decide?
3. Which field is the primary key of `transaction_items.csv`?
4. What is the difference between the grain of `transactions.csv` and `transaction_items.csv`?
5. Why could joining customers directly to transaction items distort an analysis if duplicates exist in the customer table?

## Stop point

Do **not** delete duplicates, replace labels, or build charts yet. First share your six audit results and five answers for review. The next lesson will convert the accepted decisions into a clean Power Query layer.

## Evidence to save

- Your updated workbook
- A short `docs/audit_findings.md` containing your five answers
- One screenshot of the completed audit rows

