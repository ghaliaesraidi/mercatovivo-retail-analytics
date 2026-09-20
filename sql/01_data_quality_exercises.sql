-- Complete one exercise at a time after finishing the Excel audit.
-- For every test, record the result and the proposed treatment.

-- 1. Row counts
SELECT COUNT(*) AS store_rows FROM raw.stores;
-- TODO: write the equivalent count for the other seven tables.

-- 2. Candidate primary-key duplicates
-- TODO: return transaction_id and its count where the count is greater than 1.

-- 3. Item-key duplicates
-- TODO: repeat the test for item_id.

-- 4. Store foreign-key failures
-- Hint: standardization and validation are separate questions.
-- TODO: identify transaction store values with no exact match in raw.stores.

-- 5. Product foreign-key failures
-- TODO: identify item product values with no exact match in raw.products.

-- 6. Transaction foreign-key failures
-- TODO: identify item rows whose transaction_id does not exist in raw.transactions.

-- 7. Quantity rule
-- TODO: count zero quantities separately from negative quantities.
-- TODO: verify whether negative rows are marked as RETURN.

-- 8. Discount range
-- TODO: list rows where discount_pct is below 0 or above 1.

-- 9. Category and brand consistency
-- TODO: compare raw values with TRIM/LOWER-normalized values.

-- 10. Payment-method consistency
-- TODO: list distinct raw labels and their frequencies.

-- 11. Inventory reconciliation
-- TODO: test opening + delivered - sold - waste = closing.

-- 12. Null classification
-- TODO: count blanks/nulls by field and label each as valid, invalid, or unknown.

