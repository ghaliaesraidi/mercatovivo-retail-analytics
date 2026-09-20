# Data Dictionary

The workbook contains the field-by-field dictionary. This page summarizes the grain and role of every source table for GitHub readers.

| Table | Grain | Candidate key | Role |
|---|---|---|---|
| `stores` | One store | `store_id` | Store attributes and geography |
| `products` | One product | `product_id` | Category, brand, cost, price, perishability |
| `customers` | One loyalty record | `customer_id` | Segment, age band, city, signup information |
| `promotions` | One campaign | `promotion_id` | Campaign period, target scope, planned discount |
| `transactions` | One basket | `transaction_id` | Date/time, store, customer, payment context |
| `transaction_items` | One basket line | `item_id` | Product, quantity, realized price, discount, promotion, return status |
| `inventory_weekly` | One store × product × week | Composite | Stock flow, waste, and availability |
| `monthly_targets` | One store × month | Composite | Revenue, margin, waste, and stockout targets |

## Join map

| From | Field | To | Relationship after cleaning |
|---|---|---|---|
| `transactions` | `store_id` | `stores.store_id` | Many to one |
| `transactions` | `customer_id` | `customers.customer_id` | Many to one; blank means anonymous |
| `transaction_items` | `transaction_id` | `transactions.transaction_id` | Many lines to one basket |
| `transaction_items` | `product_id` | `products.product_id` | Many to one |
| `transaction_items` | `promotion_id` | `promotions.promotion_id` | Many to one; blank means no recorded promotion |
| `inventory_weekly` | `store_id` | `stores.store_id` | Many to one |
| `inventory_weekly` | `product_id` | `products.product_id` | Many to one |
| `monthly_targets` | `store_id` | `stores.store_id` | Many to one |

## Critical business rules

- `quantity` must not be zero; a negative quantity is allowed only when `line_type = 'RETURN'`.
- `discount_pct`, target percentages, and rates are stored as decimals between 0 and 1.
- Inventory must satisfy `opening + delivered - sold - waste = closing`.
- Store and product keys must match their master tables after accepted standardization.
- Basket and item keys should be unique in the clean layer.
- Category, brand, and payment labels require consistent trimming and case.

