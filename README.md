# Fundlookup

Hosted finance ledger for buyer invoices, publisher payables, monthly P&L, expenses, partner payouts, and treasury. Replaces the Payment Tracking workbook.

## Stack

Next.js, Postgres, Prisma, Auth.js. Invite-only login.

## First run

1. Copy environment values (already in `.env.example`):

```bash
cp .env.example .env
```

2. Start Postgres:

```bash
docker compose up -d
```

3. Apply the schema, create the admin user, and import the workbook:

```bash
npx prisma migrate dev --name init
npm run seed:admin
npm run import:xlsx
```

4. Start the app:

```bash
npm run dev
```

Sign in at [http://localhost:3000](http://localhost:3000) with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` (defaults: `admin@fundlookup.co` / `changeme`).

## Daily use

- **Dashboard** — revenue, received, publisher cost, AR/AP, overdue, saved profit
- **Buyers / Publishers** — filterable ledgers with create, edit, and mark paid
- **Monthly P&L** — one period view instead of 25 Overview sheets
- **Expenses / Payouts / Treasury** — opex, Rafia/Saad/Libby draws, CC and FX
- **Directory** — buyers, publishers, verticals
- **Settings** (admin) — company defaults and invite links at `/invite/<token>`

New months are new invoices and expenses in the app. Do not add another Excel sheet.

## Deploy

Set `DATABASE_URL`, `AUTH_SECRET`, and `AUTH_URL` on Vercel, Railway, or any Node host. Point Postgres at Neon, Supabase, or your own instance. Run `npx prisma migrate deploy` on release.
