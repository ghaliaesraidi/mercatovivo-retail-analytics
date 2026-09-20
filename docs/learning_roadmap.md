# A–Z Learning Roadmap

This is a guided portfolio project. Each phase has a learning goal, evidence to create, and a review gate. Do not jump directly to Power BI: an attractive dashboard built on incorrect joins is not a strong analyst project.

## Phase 0 — Business framing

**Learn:** Translate a vague request into decisions, KPIs, scope, and stakeholders.

**Do:**

- Read the project brief.
- Rewrite the client request in your own words.
- Identify the primary decision-maker and three decisions.
- Review the KPI definitions before touching the data.

**Evidence:** One paragraph in `docs/business_understanding.md`.

**Review gate:** You can explain the project in 60 seconds without naming software.

## Phase 1 — Excel and Power Query audit

**Learn:** Grain, keys, data types, blanks, duplicates, referential integrity, reconciliation, and documentation.

**Do:**

- Inventory the eight extracts.
- Import them with Power Query; keep raw queries unchanged.
- Profile columns and distinct values.
- Test primary keys and foreign keys.
- Separate valid business events from true defects.
- Record every result and proposed rule in `AUDIT_LOG`.

**Evidence:** Completed `workbook/data_audit_starter.xlsx` and `docs/audit_findings.md`.

**Review gate:** Every proposed deletion or replacement has a written reason.

## Phase 2 — SQL cleaning and model preparation

**Learn:** SQL data types, `CASE`, joins, CTEs, aggregations, quality tests, and reusable views.

**Do:**

- Load raw CSVs without altering them.
- Reproduce the Excel checks in SQL.
- Build standardized clean views.
- Create a transaction-line fact view with product cost.
- Prove that joins do not duplicate baskets or revenue.

**Evidence:** Executable SQL files plus a short reconciliation table.

**Review gate:** Clean-row counts and excluded-row counts reconcile to raw totals.

## Phase 3 — SQL business analysis

**Learn:** Conditional aggregation, date analysis, CTEs, window functions, ranking, and business interpretation.

**Do:**

- Calculate sales, gross profit, margin, baskets, and average basket value.
- Compare actuals with monthly targets.
- Rank stores and categories.
- Compare promotion and non-promotion margin carefully.
- Combine waste and stockouts rather than reading them separately.

**Evidence:** One query per business question with a short interpretation under each query.

**Review gate:** Each conclusion contains a metric, comparison, period, and business meaning.

## Phase 4 — Power BI model and dashboard

**Learn:** Star schemas, one-to-many relationships, date tables, filter context, DAX measures, interaction design, and executive layout.

**Do:**

- Build the model described in `docs/data_model.md`.
- Use measures rather than hidden manual calculations.
- Build the four dashboard pages in `powerbi/README.md`.
- Add definitions/tooltips for ambiguous KPIs.
- Reconcile headline KPIs to SQL.

**Evidence:** `.pbix` file, screenshots, and a KPI reconciliation note.

**Review gate:** A manager can understand the problem and next action in under two minutes.

## Phase 5 — Consulting recommendations

**Learn:** Prioritization, executive writing, limitations, and action ownership.

**Do:**

- Select the three most important findings.
- Convert each finding into an action.
- Estimate direction of impact without inventing false precision.
- Name the owner and monitoring KPI.

**Evidence:** One-page memo and a dashboard executive-summary panel.

**Review gate:** Every recommendation is supported by visible evidence and acknowledges uncertainty.

## Phase 6 — GitHub and interview story

**Learn:** Reproducibility, portfolio communication, and oral defense.

**Do:**

- Replace the work-in-progress README sections with findings.
- Add dashboard screenshots with descriptive captions.
- Explain data quality, model design, and one difficult tradeoff.
- Record transparent AI use.
- Practice a two-minute and a ten-minute project explanation.

**Evidence:** Public GitHub repository and polished project page.

**Review gate:** You can answer the interview questions below without reading notes.

## Interview questions you should eventually answer

1. Why did you choose this business problem?
2. What was the grain of each fact table?
3. Which data issue was most dangerous and why?
4. How did you prevent a many-to-many join from overstating revenue?
5. Why is promotion sales share not proof of uplift?
6. How did you define gross margin?
7. What tradeoff exists between waste and availability?
8. Which recommendation would you implement first?
9. What would you request from the client next?
10. How did AI assist, and what did you personally validate?

