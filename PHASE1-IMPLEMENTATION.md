# Smart Retail ERP & POS — Phase 1 Changes

This package contains **only the files changed for Phase 1**. It is not a replacement full project.

## What was implemented

1. Centralized RBAC configuration.
2. Role/permission-aware middleware route protection.
3. Dynamic sidebar based on `module:view` permissions.
4. Server-side `requirePermission()` API guard.
5. API authorization for the existing dashboard, POS/sales, inventory, products, stock, vendors, accounting, users/roles, settings, backups, brands, categories and units endpoints.
6. Correct `401 Unauthorized` and `403 Forbidden` responses.
7. Role-specific safe landing paths to avoid redirect loops.
8. Local `.env.example` test-password setting.
9. README updated with Phase 1 notes.

## Apply the changes

Extract this package into the root of the existing project and overwrite the matching files.

Then run:

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

No Docker is required for Phase 1.

## Test role screens

- Super Admin: `admin@smartretail.local` / `Admin@123`
- Manager: `manager@smartretail.local` / `Test@123`
- Cashier: `cashier@smartretail.local` / `Test@123`
- Accountant: `accountant@smartretail.local` / `Test@123`
- Inventory Staff: `inventory@smartretail.local` / `Test@123`

After changing role/permissions, sign out and sign in again because permissions are stored in the JWT session.




Phase II

# Smart Retail ERP & POS — Phase 2 Changes

Phase 2 adds the core stock, purchasing, customer/vendor ledger and accounting-ledger workflows on top of Phase 1 RBAC.

## Included

- Stock Ledger with movement history and running balance.
- Purchase creation and purchase receiving.
- Purchase stock-in integration.
- Purchase accounting integration.
- Vendor payment workflow.
- Vendor ledger UI and API.
- Customer master screen and customer sales ledger.
- General Ledger screen and API.
- Chart of Accounts screen and API.
- Automatic accounting posting for completed POS sales.
- Automatic COGS + Inventory accounting for completed POS sales.
- Automatic accounting posting when held sales are resumed.
- Sales return stock and accounting reversal.
- Income and expense accounting postings.
- Expanded Phase 2 RBAC modules: purchases and customers.
- Comprehensive deterministic demo seed data.

## Apply

Copy the Phase 2 change files into the project produced after Phase 1 and overwrite matching files.

Then run:

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

No Docker is required.

## Demo credentials

- Super Admin: `admin@smartretail.local` / `Admin@123`
- Manager: `manager@smartretail.local` / `Test@123`
- Cashier: `cashier@smartretail.local` / `Test@123`
- Accountant: `accountant@smartretail.local` / `Test@123`
- Inventory Staff: `inventory@smartretail.local` / `Test@123`

## Seed behavior

The seed is intended for development/testing. It resets transactional demo records (sales, purchases, stock logs, accounting transactions, income, expenses and vendor payments) before recreating deterministic demo data. It does not delete users, roles, permissions, products, categories, brands or units.



Phase III
# Smart Retail ERP & POS — Phase 3 Changes

Apply this package on top of the completed Phase 2 project.

## Implemented

1. Financial reporting engine driven by posted accounting transactions.
2. Trial Balance with debit/credit balances.
3. Profit & Loss with revenue, COGS/expenses and net profit.
4. Balance Sheet with assets, liabilities, equity, current-period earnings and balance difference.
5. Cash Flow statement for Cash/Bank movements, grouped into operating, investing and financing activity.
6. Date-range filters for financial reports.
7. Inventory valuation screen and API using current stock quantity × recorded product cost.
8. Accounting transaction bug fix: manual transactions now correctly resolve `accountId` instead of treating the ID as an account name.
9. Sale return accounting now reverses both revenue/refund and COGS/inventory, keeping the accounting engine balanced.
10. Existing P&L endpoint now uses ledger transactions instead of incorrectly treating total purchases as period expense.
11. Demo seed now posts received-purchase accounting and creates an opening capital entry so the demo balance sheet has a balancing equity source.
12. Added Financial Statements and Stock Valuation navigation entries under existing RBAC modules.

## New routes

- `/accounting/reports`
- `/inventory/valuation`
- `GET /api/accounting/reports?report=trial-balance&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/accounting/reports?report=profit-loss&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/accounting/reports?report=balance-sheet&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/accounting/reports?report=cash-flow&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/inventory/valuation`

## Apply

Copy the files from this package into the existing Phase 2 project, preserving the folder structure.

Then run:

```bash
npm install
npx prisma generate
npm run prisma:seed
npm run dev
```

No Prisma schema change was required for Phase 3, so no new migration is required.

## Important demo-seed behavior

The seed script resets transactional demo data and recreates it. It now includes purchase accounting, vendor payment accounting, sales accounting, income, expenses, COGS/inventory postings, and an opening capital entry.

## Report accounting basis

- Trial Balance: period debit/credit activity.
- Profit & Loss: revenue and expense account activity in the selected period.
- Balance Sheet: account balances through the selected end date plus current-period earnings.
- Cash Flow: Cash and Bank ledger movements during the selected period.
- Inventory Valuation: current stock × each product's recorded cost price. This is a simple cost-price valuation, not a FIFO/weighted-average batch valuation.


Phase IV

# Smart Retail ERP & POS — Phase 4 Changes

Phase 4 is a completion/hardening pass on top of Phase 3.

## Included
- Dynamic sidebar for all Phase 1–4 modules.
- Admin Audit Logs screen + protected API.
- Login History screen + protected API.
- Backup management screen + protected API for backup requests/history.
- Stock Ledger screen + protected API with running stock balance.
- Barcode label printing screen using JsBarcode.
- Customer management screen + protected API.
- Purchase list/create API and purchase screen.
- General Ledger screen + protected API.
- Chart of Accounts screen + protected API.
- Expanded deterministic demo seed: 30 customers, 15 vendors, 40 login records, 60 audit records, 5 backup records, plus the existing transactional demo data.
- Middleware covers all new dashboard route groups.

## Apply
Copy the files in this archive over the existing Phase 3 project.

Then run:

```bash
npm install
npx prisma generate
npm run prisma:seed
npm run dev
```

No schema migration is required for Phase 4.

## New screens
- /customers
- /purchases
- /inventory/ledger
- /inventory/barcodes
- /accounting/ledger
- /accounting/accounts
- /admin/audit-logs
- /admin/login-history
- /admin/backups

## Backup note
The UI records backup requests/history. Actual PostgreSQL `pg_dump` execution should be wired to the deployment/host environment because the command availability and filesystem destination are environment-specific.


Phase V

# Phase 5 — Production Hardening, Validation & Complete Demo Dataset

## Implemented

- Centralized API response/error helpers.
- Zod validation for products, customers and chart-of-accounts entries.
- Permission checks on product/customer/accounting APIs.
- Permission checks added to income/expense APIs.
- Audit logging for important create operations.
- Database health endpoint: `/api/health`.
- Global error page, 404 page and dashboard loading UI.
- Expanded deterministic demo data:
  - product descriptions/images/expiry examples
  - product variants
  - pending and cancelled purchases
  - stock adjustments and stock-out examples
  - held sale
  - returned sale
  - accounting reversals for the returned sale
  - existing customers, vendors, sales, purchases, income, expenses, ledgers, logs and backups
- Seed remains deterministic for transactional demo records by clearing/recreating those records.

## Local verification

```bash
npm install
npx prisma generate
npm run prisma:seed
npm run dev
```

Health check:

`http://localhost:3000/api/health`

A healthy response contains `status: "ok"` and `database: "ok"`.

## Demo credentials

- Super Admin: `admin@smartretail.local` / `Admin@123`
- Manager: `manager@smartretail.local` / `Test@123`
- Cashier: `cashier@smartretail.local` / `Test@123`
- Accountant: `accountant@smartretail.local` / `Test@123`
- Inventory Staff: `inventory@smartretail.local` / `Test@123`

## Important

This phase does not change the Prisma schema, so no migration is required.


Phase 6
# Phase 6 — Accounting Ledger

This phase adds a complete accounting ledger on top of Phase 5 without changing the Prisma schema.

## Included
- General Ledger with date range, account, reference type and text search filters.
- Opening balance and closing balance for a selected account.
- Running account balance based on normal debit/credit balance rules.
- Period debit/credit totals.
- Account summary across the selected period.
- CSV export from the ledger screen.
- Manual balanced journal entry UI and API.
- Journal validation requiring at least two lines and equal debits/credits.
- Income posting to Cash/Bank and Other Income automatically.
- Expense posting to Operating Expenses and Cash/Bank automatically.
- Audit logging for manual journal, income and expense creation.

## Apply
Apply these changed files on top of Phase 5. No Prisma migration is required.

Run:

```bash
npm install
npx prisma generate
npm run prisma:seed
npm run dev
```

Open `/accounting/ledger` as an Accountant or Super Admin.


Phase 7

# Phase 7 — Automatic Accounting Updates

Phase 7 builds on the Phase 6 Accounting Ledger and makes operational transactions automatically post balanced accounting entries.

## Covered
- Completed POS sale: Cash/Bank, Sales Revenue, Sales Tax Payable, COGS and Inventory.
- Held sale resume: accounting is posted when the sale becomes completed.
- Sale return: revenue/tax reversal, refund, Inventory and COGS reversal.
- Received purchase: Inventory, Cash/Bank and Accounts Payable.
- Vendor payment: Accounts Payable and Cash/Bank.
- Income: Cash and Other Income.
- Expense: Operating Expenses and Cash.

## Idempotency
Automatic posting checks `refType + refId` before creating entries. Repeating a request or running reconciliation does not duplicate a business document's ledger entries.

## Reconciliation
`POST /api/accounting/reconcile`

Dry scan:
```json
{ "repair": false }
```

Repair missing entries:
```json
{ "repair": true }
```

Requires Accounting `create` permission. Repairs create an audit log entry.

## Database
No Prisma schema migration is required for Phase 7.




Phase I ----------------------
# Smart Retail ERP & POS — Phase 1 Changes

This package contains **only the files changed for Phase 1**. It is not a replacement full project.

## What was implemented

1. Centralized RBAC configuration.
2. Role/permission-aware middleware route protection.
3. Dynamic sidebar based on `module:view` permissions.
4. Server-side `requirePermission()` API guard.
5. API authorization for the existing dashboard, POS/sales, inventory, products, stock, vendors, accounting, users/roles, settings, backups, brands, categories and units endpoints.
6. Correct `401 Unauthorized` and `403 Forbidden` responses.
7. Role-specific safe landing paths to avoid redirect loops.
8. Local `.env.example` test-password setting.
9. README updated with Phase 1 notes.

## Apply the changes

Extract this package into the root of the existing project and overwrite the matching files.

Then run:

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

No Docker is required for Phase 1.

## Test role screens

- Super Admin: `admin@smartretail.local` / `Admin@123`
- Manager: `manager@smartretail.local` / `Test@123`
- Cashier: `cashier@smartretail.local` / `Test@123`
- Accountant: `accountant@smartretail.local` / `Test@123`
- Inventory Staff: `inventory@smartretail.local` / `Test@123`

After changing role/permissions, sign out and sign in again because permissions are stored in the JWT session.




Phase II

# Smart Retail ERP & POS — Phase 2 Changes

Phase 2 adds the core stock, purchasing, customer/vendor ledger and accounting-ledger workflows on top of Phase 1 RBAC.

## Included

- Stock Ledger with movement history and running balance.
- Purchase creation and purchase receiving.
- Purchase stock-in integration.
- Purchase accounting integration.
- Vendor payment workflow.
- Vendor ledger UI and API.
- Customer master screen and customer sales ledger.
- General Ledger screen and API.
- Chart of Accounts screen and API.
- Automatic accounting posting for completed POS sales.
- Automatic COGS + Inventory accounting for completed POS sales.
- Automatic accounting posting when held sales are resumed.
- Sales return stock and accounting reversal.
- Income and expense accounting postings.
- Expanded Phase 2 RBAC modules: purchases and customers.
- Comprehensive deterministic demo seed data.

## Apply

Copy the Phase 2 change files into the project produced after Phase 1 and overwrite matching files.

Then run:

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

No Docker is required.

## Demo credentials

- Super Admin: `admin@smartretail.local` / `Admin@123`
- Manager: `manager@smartretail.local` / `Test@123`
- Cashier: `cashier@smartretail.local` / `Test@123`
- Accountant: `accountant@smartretail.local` / `Test@123`
- Inventory Staff: `inventory@smartretail.local` / `Test@123`

## Seed behavior

The seed is intended for development/testing. It resets transactional demo records (sales, purchases, stock logs, accounting transactions, income, expenses and vendor payments) before recreating deterministic demo data. It does not delete users, roles, permissions, products, categories, brands or units.



Phase III
# Smart Retail ERP & POS — Phase 3 Changes

Apply this package on top of the completed Phase 2 project.

## Implemented

1. Financial reporting engine driven by posted accounting transactions.
2. Trial Balance with debit/credit balances.
3. Profit & Loss with revenue, COGS/expenses and net profit.
4. Balance Sheet with assets, liabilities, equity, current-period earnings and balance difference.
5. Cash Flow statement for Cash/Bank movements, grouped into operating, investing and financing activity.
6. Date-range filters for financial reports.
7. Inventory valuation screen and API using current stock quantity × recorded product cost.
8. Accounting transaction bug fix: manual transactions now correctly resolve `accountId` instead of treating the ID as an account name.
9. Sale return accounting now reverses both revenue/refund and COGS/inventory, keeping the accounting engine balanced.
10. Existing P&L endpoint now uses ledger transactions instead of incorrectly treating total purchases as period expense.
11. Demo seed now posts received-purchase accounting and creates an opening capital entry so the demo balance sheet has a balancing equity source.
12. Added Financial Statements and Stock Valuation navigation entries under existing RBAC modules.

## New routes

- `/accounting/reports`
- `/inventory/valuation`
- `GET /api/accounting/reports?report=trial-balance&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/accounting/reports?report=profit-loss&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/accounting/reports?report=balance-sheet&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/accounting/reports?report=cash-flow&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/inventory/valuation`

## Apply

Copy the files from this package into the existing Phase 2 project, preserving the folder structure.

Then run:

```bash
npm install
npx prisma generate
npm run prisma:seed
npm run dev
```

No Prisma schema change was required for Phase 3, so no new migration is required.

## Important demo-seed behavior

The seed script resets transactional demo data and recreates it. It now includes purchase accounting, vendor payment accounting, sales accounting, income, expenses, COGS/inventory postings, and an opening capital entry.

## Report accounting basis

- Trial Balance: period debit/credit activity.
- Profit & Loss: revenue and expense account activity in the selected period.
- Balance Sheet: account balances through the selected end date plus current-period earnings.
- Cash Flow: Cash and Bank ledger movements during the selected period.
- Inventory Valuation: current stock × each product's recorded cost price. This is a simple cost-price valuation, not a FIFO/weighted-average batch valuation.


Phase IV

# Smart Retail ERP & POS — Phase 4 Changes

Phase 4 is a completion/hardening pass on top of Phase 3.

## Included
- Dynamic sidebar for all Phase 1–4 modules.
- Admin Audit Logs screen + protected API.
- Login History screen + protected API.
- Backup management screen + protected API for backup requests/history.
- Stock Ledger screen + protected API with running stock balance.
- Barcode label printing screen using JsBarcode.
- Customer management screen + protected API.
- Purchase list/create API and purchase screen.
- General Ledger screen + protected API.
- Chart of Accounts screen + protected API.
- Expanded deterministic demo seed: 30 customers, 15 vendors, 40 login records, 60 audit records, 5 backup records, plus the existing transactional demo data.
- Middleware covers all new dashboard route groups.

## Apply
Copy the files in this archive over the existing Phase 3 project.

Then run:

```bash
npm install
npx prisma generate
npm run prisma:seed
npm run dev
```

No schema migration is required for Phase 4.

## New screens
- /customers
- /purchases
- /inventory/ledger
- /inventory/barcodes
- /accounting/ledger
- /accounting/accounts
- /admin/audit-logs
- /admin/login-history
- /admin/backups

## Backup note
The UI records backup requests/history. Actual PostgreSQL `pg_dump` execution should be wired to the deployment/host environment because the command availability and filesystem destination are environment-specific.


Phase V

# Phase 5 — Production Hardening, Validation & Complete Demo Dataset

## Implemented

- Centralized API response/error helpers.
- Zod validation for products, customers and chart-of-accounts entries.
- Permission checks on product/customer/accounting APIs.
- Permission checks added to income/expense APIs.
- Audit logging for important create operations.
- Database health endpoint: `/api/health`.
- Global error page, 404 page and dashboard loading UI.
- Expanded deterministic demo data:
  - product descriptions/images/expiry examples
  - product variants
  - pending and cancelled purchases
  - stock adjustments and stock-out examples
  - held sale
  - returned sale
  - accounting reversals for the returned sale
  - existing customers, vendors, sales, purchases, income, expenses, ledgers, logs and backups
- Seed remains deterministic for transactional demo records by clearing/recreating those records.

## Local verification

```bash
npm install
npx prisma generate
npm run prisma:seed
npm run dev
```

Health check:

`http://localhost:3000/api/health`

A healthy response contains `status: "ok"` and `database: "ok"`.

## Demo credentials

- Super Admin: `admin@smartretail.local` / `Admin@123`
- Manager: `manager@smartretail.local` / `Test@123`
- Cashier: `cashier@smartretail.local` / `Test@123`
- Accountant: `accountant@smartretail.local` / `Test@123`
- Inventory Staff: `inventory@smartretail.local` / `Test@123`

## Important

This phase does not change the Prisma schema, so no migration is required.


Phase 6
# Phase 6 — Accounting Ledger

This phase adds a complete accounting ledger on top of Phase 5 without changing the Prisma schema.

## Included
- General Ledger with date range, account, reference type and text search filters.
- Opening balance and closing balance for a selected account.
- Running account balance based on normal debit/credit balance rules.
- Period debit/credit totals.
- Account summary across the selected period.
- CSV export from the ledger screen.
- Manual balanced journal entry UI and API.
- Journal validation requiring at least two lines and equal debits/credits.
- Income posting to Cash/Bank and Other Income automatically.
- Expense posting to Operating Expenses and Cash/Bank automatically.
- Audit logging for manual journal, income and expense creation.

## Apply
Apply these changed files on top of Phase 5. No Prisma migration is required.

Run:

```bash
npm install
npx prisma generate
npm run prisma:seed
npm run dev
```

Open `/accounting/ledger` as an Accountant or Super Admin.


Phase 7

# Phase 7 — Automatic Accounting Updates

Phase 7 builds on the Phase 6 Accounting Ledger and makes operational transactions automatically post balanced accounting entries.

## Covered
- Completed POS sale: Cash/Bank, Sales Revenue, Sales Tax Payable, COGS and Inventory.
- Held sale resume: accounting is posted when the sale becomes completed.
- Sale return: revenue/tax reversal, refund, Inventory and COGS reversal.
- Received purchase: Inventory, Cash/Bank and Accounts Payable.
- Vendor payment: Accounts Payable and Cash/Bank.
- Income: Cash and Other Income.
- Expense: Operating Expenses and Cash.

## Idempotency
Automatic posting checks `refType + refId` before creating entries. Repeating a request or running reconciliation does not duplicate a business document's ledger entries.

## Reconciliation
`POST /api/accounting/reconcile`

Dry scan:
```json
{ "repair": false }
```

Repair missing entries:
```json
{ "repair": true }
```

Requires Accounting `create` permission. Repairs create an audit log entry.

## Database
No Prisma schema migration is required for Phase 7.


Phase II

# Phase 2 — Stock/Inventory Changes

Apply this patch on top of the Phase 1 RBAC project.

Changes: inventory dashboard/filtering/editing, stock adjustment validation/audit, inventory summary API, accurate stock ledger balances/filtering, product GET/PUT/DELETE hardening, and deterministic low/out-of-stock seed scenarios.

No Prisma schema migration is required.

Run after applying:

```bash
npx prisma generate
npm run prisma:seed
npm run dev
```


Phase 3 -----------------
# Phase 3 — Customer & Vendor Ledgers

Changes only; apply on top of the Phase 2 project.

## Included
- Customer receivable ledger with credit-sale, return, and payment entries.
- New CustomerPayment model and migration.
- Customer payment API with outstanding-balance validation.
- Customer page: receivables summary, ledger, and payment recording.
- POS: customer selection and Credit / Customer Due payment method.
- Credit sales post to Accounts Receivable instead of Cash/Bank.
- Credit-sale validation requires a customer.
- Credit-sale returns reduce Accounts Receivable instead of refunding Cash/Bank.
- Vendor ledger now excludes pending/cancelled purchases from payables.
- Vendor payment validation prevents overpayment.
- Vendor ledger page now displays payable summary and structured ledger data.
- Demo seed data includes credit sales, customer payment, and a vendor follow-up payment without double-counting initial purchase payments.

## Apply
1. Extract this ZIP over the Phase 2 project root.
2. Run `npx prisma generate`.
3. Run `npx prisma migrate dev` (the included migration is for this phase).
4. Run `npm run prisma:seed`.
5. Run `npm run dev`.

No Docker changes are included.

Phase 4 ------------------
# Phase 4 — Accounting Ledger Changes

Apply these changes on top of the Phase 3 Customer/Vendor Ledger changes.

## Included
- Added `JournalEntry` to group double-entry journal lines.
- Added nullable `journalEntryId` relation/index to `Transaction`.
- Added migration `20260923140000_phase4_accounting_ledger`.
- Manual journals are now stored with a unique JE number and must balance.
- General Ledger displays the journal number and supports more reference types.
- Added Trial Balance API and screen with date filtering and CSV export.
- Added Trial Balance navigation under Accounting.
- Existing accounting transaction rows remain valid; no old data is deleted.

## Apply
```bash
npx prisma migrate dev
npx prisma generate
npm run dev
```

## Test
1. Login as Accountant or Super Admin.
2. Open Accounting → General Ledger.
3. Post a manual journal and verify a JE-xxxxxx number appears.
4. Try an unbalanced journal and verify it is rejected.
5. Open Accounting → Trial Balance.
6. Select a period containing seeded transactions.
7. Confirm Total Debit equals Total Credit and status is Balanced.
8. Export Trial Balance CSV.



-------- Phase 5 -----------------
# Phase 5 — Automatic Accounting Updates

Apply these changes over the Phase 4 project.

## Included
- Automatic accounting posting for completed POS sales.
- Credit sales post to Accounts Receivable.
- Automatic COGS and inventory accounting on sales.
- Automatic accounting reversal for sales returns.
- Automatic inventory/accounting updates when purchases are received.
- Automatic purchase payable/cash/bank postings.
- Automatic customer payment posting against Accounts Receivable.
- Automatic vendor payment posting against Accounts Payable.
- Automatic income posting.
- Automatic expense posting.
- Accounting reconciliation/repair API for existing business records.
- Duplicate-posting protection using reference IDs.
- Audit logging for accounting-triggering operations.

## Apply
Extract the ZIP into the Phase 4 project root and replace/add the files.

No new Prisma migration is required by Phase 5.

Then run:

npm install
npx prisma generate
npm run prisma:seed
npm run dev

## Reconciliation API
POST /api/accounting/reconcile

Body:
{"repair":true}

This scans existing completed sales, returns, received purchases, customer/vendor payments, income, and expenses and repairs missing accounting postings without duplicating already-posted references.

-------------   Phase 6 --------------
# Phase 6 — POS Completion + Returns

Apply this ZIP on top of the Phase 5 project.

## Changed files

- `src/app/(dashboard)/pos/page.js`
- `src/app/api/sales/route.js`
- `src/app/api/sales/[id]/resume/route.js`
- `src/app/api/sales/[id]/return/route.js`

## Changes

- Added customer selection to POS.
- Added recent completed sales list.
- Added full-sale return UI and confirmation dialog.
- Return restores all returned items to stock.
- Return creates inventory ledger entries.
- Return now uses the existing `postSaleReturnAccounting()` service so revenue, tax, cash/bank, inventory and COGS are reversed consistently.
- Added audit logs for sales, held sales, resumed sales and returns.
- Added POS permission checks to sales GET/POST.
- Server now treats product selling price and tax rate as authoritative instead of trusting client-supplied unit prices.
- Added server-side product availability and stock validation.
- Prevented duplicate product lines by merging quantities.
- Prevented discount values from exceeding the subtotal.
- Improved held-sale and resume flow.
- Added out-of-stock prevention in the POS UI.
- Added available-stock quantity limits in the POS UI.
- Added busy-state protection to reduce duplicate checkout/return submissions.
- Added payment method and customer data to sales history.
- No Prisma schema changes are required.

## Important limitation

Phase 6 implements **complete-sale returns**. Partial item/quantity returns are intentionally rejected. Partial returns can be added as a later enhancement with item-level return quantities and corresponding proportional accounting.

## Apply

Extract this ZIP into the Phase 5 project root and replace the files while preserving directories.

Then run:

```bash
npx prisma generate
npm run prisma:seed
npm run dev
```

No migration is required for this phase.



