# One Point POS

Cloud point-of-sale and inventory for a Sri Lankan **book shop + communication centre**. The counter PC runs billing; the owner dashboard is mobile-responsive and updates live after each sale.

## Stack

- **Client:** Next.js 14, React, Tailwind CSS
- **API:** Node.js, Express, Prisma, Socket.IO
- **Database:** PostgreSQL
- **Auth:** JWT with roles `OWNER` and `CASHIER`

## Local setup

### 1. PostgreSQL

Docker (recommended):

```bash
docker compose up -d
```

Or point `server/.env` `DATABASE_URL` at any Postgres 14+ instance.

### 2. API

```bash
cd server
copy .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

API: http://localhost:4000 — health check: `GET /api/health`

### 3. Web app

```bash
cd client
copy .env.example .env.local
npm install
npm run dev
```

App: http://localhost:3000

### Default logins

| Role | Email | Password |
| --- | --- | --- |
| Owner | owner@onepoint.lk | KaveeOnepoint2026 |
| Cashier | cashier@onepoint.lk | Cashier@2026 |

Cashiers land on `/pos` only (no cost prices, profit, users, or drawer close). Owners get `/owner` and can still open POS.

## What it does

- Barcode / SKU search, cart, discounts, cash / card / credit
- Quick buttons for photocopy, print, lamination, mobile reloads (no unit stock)
- Stock decrements in the same transaction as the sale
- Low-stock highlighting
- 80mm thermal receipt (`window.print()`)
- Owner live KPIs (sales, profit, payment mix, top items)
- End-of-day cash drawer: expected vs counted cash and variance
- Customer credit balances and settlements

## Cloud deploy

1. **Database:** Neon, Supabase Postgres, or RDS. Run `npx prisma migrate deploy` then `npm run db:seed` (or create users yourself).
2. **API:** Render / Railway / Fly. Set `DATABASE_URL`, `JWT_SECRET` (long random), `CLIENT_ORIGIN` (your Vercel URL), `PORT`. Enable WebSockets.
3. **Web:** Vercel on `/client`. Set `NEXT_PUBLIC_API_URL` to the public API origin (no trailing slash).

Change default passwords before going live. Restrict CORS to your real shop domain.

## Project layout

See `implementation_plan.md` for architecture, schema, and RBAC rules.

```
server/     Express API + Prisma
client/     Next.js POS + owner dashboard
docker-compose.yml
```
