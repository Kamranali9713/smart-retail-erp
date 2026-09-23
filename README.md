# Smart Retail ERP & POS System

A retail shop management + point-of-sale application built with Next.js (App Router, JavaScript),
Tailwind CSS, Prisma ORM and PostgreSQL.

> **Scope note:** This scaffold implements the core, working modules end-to-end — auth & RBAC,
> POS checkout, inventory & stock, vendors, basic accounting (income/expense + P&L), reports with
> PDF/Excel export, settings, and an audit/login log. The Prisma schema models **every** table from
> the original spec (purchases, purchase orders, vendor ledgers, full chart of accounts, backups,
> etc.) so you have the data layer ready to extend with the remaining UI screens (purchase orders,
> barcode label printing, scheduled backups, balance sheet/cash flow reports) as next milestones.

## 1. Requirements

- Node.js 20+
- Docker & Docker Compose (recommended), or a local PostgreSQL 16 instance

## 2. Quick Start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

The app runs migrations automatically on container start. Once it's up, seed the database:

```bash
docker compose exec app npm run prisma:seed
```

Visit **http://localhost:3000** and log in with:

- Email: `admin@smartretail.local`
- Password: `Admin@123`

## 3. Local Development (without Docker)

```bash
npm install
cp .env.example .env   # point DATABASE_URL at your local Postgres
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

## 4. Project Structure

```
src/
├── app
│   ├── (dashboard)/        # Protected admin pages (dashboard, pos, inventory, vendors, accounting, reports, settings, users)
│   ├── api/                # REST API routes (products, sales, vendors, accounting, settings, users, roles, backups)
│   ├── login/
│   └── layout.js
├── components/             # Sidebar, Topbar, Providers
├── lib/                    # prisma client, auth (NextAuth), utils
└── middleware.js           # route protection
prisma/
├── schema.prisma           # full data model for every module in the spec
└── seed.js                 # roles, permissions, admin user, sample products, chart of accounts
```

## 5. Roles & Permissions

Seeded roles: `SUPER_ADMIN`, `MANAGER`, `CASHIER`, `ACCOUNTANT`, `INVENTORY_STAFF`, each mapped to
module-level permissions (`view/create/edit/delete` per module) stored in the `Permission` /
`Role` tables. Use `hasPermission(session, module, action)` from `src/lib/auth.js` to gate UI or
API actions beyond `SUPER_ADMIN`.

## 6. Extending This Scaffold

The schema already has the tables for these — wiring up UI/API is the remaining work:

- **Purchase Orders**: `Purchase` / `PurchaseItem` models exist; add a `/purchases` page + API
  mirroring the `sales` route pattern (stock increments instead of decrements).
- **Barcode/QR printing**: add `jsbarcode`/`qrcode` (already in `package.json`) to a
  `/inventory/barcodes` page and print via `react-to-print`.
- **Balance Sheet / Cash Flow / Trial Balance**: build off the `Account` / `Transaction` models
  using the same aggregation pattern as `/api/accounting/pnl`.
- **Scheduled backups**: `scripts/backup.sh` (add your own `pg_dump` cron) + log to `/api/backups`.
- **Thermal 58mm/80mm receipt widths**: `Settings.receiptWidth` is already stored; adjust the
  `#receipt-print` CSS width in `globals.css` based on it.

## 7. Tech Stack

Next.js 14 (App Router, JS) · Tailwind CSS · Prisma ORM · PostgreSQL · NextAuth (JWT/credentials) ·
React Hook Form + Zod · Recharts · jsPDF/jspdf-autotable · XLSX · Docker.









# Smart Retail ERP & POS System

A retail shop management + point-of-sale application built with Next.js (App Router, JavaScript),
Tailwind CSS, Prisma ORM and PostgreSQL.

> **Scope note:** This scaffold implements the core, working modules end-to-end — auth & RBAC,
> POS checkout, inventory & stock, vendors, basic accounting (income/expense + P&L), reports with
> PDF/Excel export, settings, and an audit/login log. The Prisma schema models **every** table from
> the original spec (purchases, purchase orders, vendor ledgers, full chart of accounts, backups,
> etc.) so you have the data layer ready to extend with the remaining UI screens (purchase orders,
> barcode label printing, scheduled backups, balance sheet/cash flow reports) as next milestones.

## 1. Requirements

- Node.js 20+
- Docker & Docker Compose (recommended), or a local PostgreSQL 16 instance

## 2. Quick Start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

The app runs migrations automatically on container start. Once it's up, seed the database:

```bash
docker compose exec app npm run prisma:seed
```

Visit **http://localhost:3000** and log in with:

- Email: `admin@smartretail.local`
- Password: `Admin@123`

## 3. Local Development (without Docker)

```bash
npm install
cp .env.example .env   # point DATABASE_URL at your local Postgres
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

## 4. Project Structure

```
src/
├── app
│   ├── (dashboard)/        # Protected admin pages (dashboard, pos, inventory, vendors, accounting, reports, settings, users)
│   ├── api/                # REST API routes (products, sales, vendors, accounting, settings, users, roles, backups)
│   ├── login/
│   └── layout.js
├── components/             # Sidebar, Topbar, Providers
├── lib/                    # prisma client, auth (NextAuth), utils
└── middleware.js           # route protection
prisma/
├── schema.prisma           # full data model for every module in the spec
└── seed.js                 # roles, permissions, admin user, sample products, chart of accounts
```


### Phase 1 changes

Phase 1 hardens the existing authentication/RBAC foundation before the next ERP modules are added:

- Role-aware route protection in `src/middleware.js`.
- Dynamic sidebar visibility based on the authenticated user's `module:view` permissions.
- Centralized RBAC helpers in `src/lib/rbac-config.js` and `src/lib/rbac.js`.
- Server-side permission checks for users, roles, settings, dashboard, products, stock adjustments, vendors, sales, accounting, backups, categories, brands and units APIs.
- Unauthorized API requests return `401`; authenticated users without the required permission return `403`.
- Role-specific landing routes prevent redirect loops (`/pos` for cashier, `/accounting` for accountant, `/inventory` for inventory staff).
- `.env.example` now includes `DEFAULT_TEST_PASSWORD`.

After changing a user's role/permissions, sign out and sign in again so the JWT receives the latest permission set.

## 5. Roles & Permissions

Seeded roles: `SUPER_ADMIN`, `MANAGER`, `CASHIER`, `ACCOUNTANT`, `INVENTORY_STAFF`, each mapped to
module-level permissions (`view/create/edit/delete` per module) stored in the `Permission` /
`Role` tables. Use `hasPermission(session, module, action)` from `src/lib/auth.js` to gate UI or
API actions beyond `SUPER_ADMIN`.

## 6. Extending This Scaffold

The schema already has the tables for these — wiring up UI/API is the remaining work:

- **Purchase Orders**: `Purchase` / `PurchaseItem` models exist; add a `/purchases` page + API
  mirroring the `sales` route pattern (stock increments instead of decrements).
- **Barcode/QR printing**: add `jsbarcode`/`qrcode` (already in `package.json`) to a
  `/inventory/barcodes` page and print via `react-to-print`.
- **Balance Sheet / Cash Flow / Trial Balance**: build off the `Account` / `Transaction` models
  using the same aggregation pattern as `/api/accounting/pnl`.
- **Scheduled backups**: `scripts/backup.sh` (add your own `pg_dump` cron) + log to `/api/backups`.
- **Thermal 58mm/80mm receipt widths**: `Settings.receiptWidth` is already stored; adjust the
  `#receipt-print` CSS width in `globals.css` based on it.

## 7. Tech Stack

Next.js 14 (App Router, JS) · Tailwind CSS · Prisma ORM · PostgreSQL · NextAuth (JWT/credentials) ·
React Hook Form + Zod · Recharts · jsPDF/jspdf-autotable · XLSX · Docker.
