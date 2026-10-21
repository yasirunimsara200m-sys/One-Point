# One Point — Implementation Plan

Cloud POS and inventory system for a combined **book shop + communication centre** in Sri Lanka. Counter PC runs billing; the owner uses a mobile-responsive dashboard with live sales.

## 1. Product scope

| Area | Counter (cashier) | Owner |
| --- | --- | --- |
| Auth | Login → POS only | Login → full app |
| Billing | Cart, barcode, discounts, cash/card/credit | Same + override prices |
| Inventory | Search by name/SKU/barcode, sell | CRUD, cost prices, low-stock |
| Services | Quick buttons (photocopy, print, lamination, reloads) | Configure service SKUs and prices |
| Finance | No cost/profit | Today sales, profit, payment mix, top items, drawer close |
| Users | — | Create/disable cashiers |

Default currency: **LKR**. Timezone: **Asia/Colombo**. Receipt: **80mm thermal**.

## 2. Architecture

```
┌─────────────────┐     REST + JWT      ┌──────────────────┐     Prisma      ┌────────────┐
│ Next.js (POS +  │◄───────────────────►│ Express API      │◄──────────────►│ PostgreSQL │
│ owner dashboard)│     Socket.IO       │ :4000            │                │ :5432      │
└─────────────────┘                     └──────────────────┘                └────────────┘
        PC / phone                              Node.js
```

- **Frontend:** Next.js (App Router) + Tailwind CSS. Single SPA-style app with role-gated routes.
- **Backend:** Express, Prisma ORM, JWT + bcrypt, Socket.IO for live dashboard.
- **Database:** PostgreSQL (Docker locally; any managed PG in production).
- **Realtime:** After each successful sale, the API emits `sale:created`. Owner UI refreshes KPIs without polling.

Monorepo layout:

```
/server     Express + Prisma
/client     Next.js POS + dashboard
docker-compose.yml
```

## 3. Role-based access

| Capability | cashier | owner |
| --- | --- | --- |
| POS billing, barcode, payments | yes | yes |
| Product **sell** price | yes | yes |
| Product **cost** price | **hidden** | yes |
| Profit, drawer, user admin, settings | **denied (403)** | yes |
| Stock qty (for selling) | yes (read) | yes (read/write) |

Middleware: `requireAuth` → `requireRole('OWNER')` on reports, users, product cost fields.

## 4. Data model

- **User** — email, password hash, role `OWNER | CASHIER`, active flag.
- **Category** — name, kind `PRODUCT | SERVICE`.
- **Product** — sku, barcode, name, prices, `trackStock`, qty, low-stock threshold, active.
- **Customer** — name, phone, credit balance.
- **Sale** — invoice number, cashier, optional customer, totals, payment split (cash/card/credit), timestamps (Colombo).
- **SaleItem** — product snapshot (name, unit price, cost at sale), qty, line total.
- **CreditLedger** — customer credit issued / later settlement.
- **DrawerSession** — opening float, expected cash from sales, counted cash, variance, notes.

Stock: `trackStock=true` products decrement in the **same DB transaction** as the sale. Services (`trackStock=false`) never decrement.

## 5. API surface

| Method | Path | Roles |
| --- | --- | --- |
| POST | `/api/auth/login` | public |
| GET | `/api/auth/me` | any |
| CRUD | `/api/users` | owner |
| CRUD | `/api/categories`, `/api/products` | cashier read; owner write |
| GET | `/api/products/barcode/:code` | any |
| CRUD | `/api/customers` | any (credit settle: owner or cashier) |
| POST/GET | `/api/sales` | any |
| GET | `/api/sales/:id` | any |
| GET | `/api/reports/today` | owner |
| GET | `/api/reports/range` | owner |
| GET/POST | `/api/drawer` open/close/status | owner (close); cashier may open register |

Sale POST is transactional: validate stock → insert sale + lines → decrement stock → update credit → emit socket.

## 6. UI modules

### 6.1 Login
Email/password. Redirect: cashier → `/pos`, owner → `/owner` (can still open POS).

### 6.2 POS (`/pos`)
Three columns on desktop, stacked on tablet:

1. **Catalogue** — search + barcode field (auto-submit on scanner Enter), category chips, product tiles.
2. **Cart** — qty ±, line discount, remove, bill discount.
3. **Pay + services** — quick service pad; Cash / Card / Credit (customer picker); print 80mm receipt.

Cashiers never see cost or margin on tiles or receipts.

### 6.3 Owner mobile dashboard (`/owner`)
Cards: today’s sales, profit, cash/card/credit mix, top items, low-stock list. Socket live update. Bottom nav: Dashboard, Inventory, Reports, Drawer, More.

### 6.4 Inventory / customers / users / drawer
Standard CRUD tables; low-stock rows highlighted. Drawer: opening float, expected cash, count, variance, print/export summary.

### 6.5 Receipt
`window.print()` stylesheet: 80mm width, shop header, invoice no, items, tender, change, thank-you line. No cost prices.

## 7. Seed data (local demo)

- Users: `owner@onepoint.lk` / `Owner@123`, `cashier@onepoint.lk` / `Cashier@123`
- Categories: Books, Stationery, School, Photocopy & Print, Reloads, Other services
- Mix of tracked SKUs (barcodes) and service SKUs (quick buttons)
- One sample customer with optional credit

## 8. Build order

1. This plan + README + Docker Postgres.
2. Prisma schema, seed, Express auth and health.
3. Products, customers, sales (transaction + sockets).
4. Reports + drawer.
5. Next.js login, POS, receipt.
6. Owner dashboard and admin screens.
7. Local verify: seed, login both roles, sale deducts stock, owner APIs 403 for cashier.

## 9. Deploy

- **DB:** Neon / Supabase Postgres / RDS. Set `DATABASE_URL`.
- **API:** Render / Railway / Fly (`server/`). Enable WebSockets for Socket.IO.
- **Web:** Vercel (`client/`) with `NEXT_PUBLIC_API_URL` pointing at the API.
- Set `JWT_SECRET`, CORS origin, and change default passwords before production.

## 10. Out of scope (v1)

Hardware cash-drawer kick codes, fiscal devices, multi-branch, Sinhala/Tamil i18n UI (copy is English + LKR), supplier POs. Schema leaves room for later branches via unused fields if needed.
