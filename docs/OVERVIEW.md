# Project Overview

## What this system does

The Susu System is a savings and loan management platform. It supports:

- **Susu (rotating savings):** Clients save a fixed or flexible daily amount over a cycle (e.g. monthly). Agents record daily collections; at cycle end the client receives a payout (minus agent commission). Payouts can be moved to savings or transferred.
- **Loans:** Loan products, applications, approval workflow, disbursement, repayments, and penalties. Repayment via cash, mobile money, bank transfer, or Susu deduction.
- **Savings:** Savings accounts, emergency withdrawals, and linkage to Susu payouts.
- **Roles:** Business Admin (full control), Manager (agents, clients, reports), Agent (collections, applications, commission), Client (schedules, notifications, savings).

## Tech stack

- **Framework:** Next.js 16 (App Router), React 18, TypeScript (run `npm audit` for security; see README). Public site matches the original PHP structure and assets: Home, Services, About Us, Contact Us, News (top bar, header with “Digital Banking System”, 4-column footer, hero sliders, service images, partner logos, etc.). See `public/assets/images/` and [DISPLAYS.md](./DISPLAYS.md).
- **UI:** Tailwind CSS, Framer Motion
- **Data:** PostgreSQL, Prisma ORM
- **Cache / session / rate limit:** Redis (e.g. Upstash or self-hosted)
- **Auth:** Auth.js (session-based, role-aware)
- **Validation:** Zod; **Forms:** React Hook Form + Zod
- **Server state (client):** TanStack Query

## Folder structure

- `app/` – Routes and layouts: `(auth)`, `(dashboard)` (admin, agent, client, manager), `api/`
- `components/` – Reusable and role-specific UI
- `lib/` – Shared logic, engines (susu, loan), auth helpers, db client
- `prisma/` – Schema and migrations
- `public/` – Static assets
- `styles/` – Global CSS and Tailwind
- `docs/` – This documentation
- `docker-compose.yml` – Local dev: PostgreSQL + Redis (run with `docker compose up -d`)

## Local development

Run everything locally for testing; when satisfied, deploy to your online host. Use **Docker** for PostgreSQL and Redis so you don’t need to install them:

1. From the project root (`next-app`): `docker compose up -d`
2. Copy `.env.example` to `.env`, set `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and keep `DATABASE_URL` as in the example (matches Docker).
3. `npm install`, `npm run db:push`, `npm run db:seed`, then `npm run dev`. Open http://localhost:3000.

Full steps and “setup without Docker” are in the main [README](../README.md#run-locally-recommended-docker-for-postgres--redis).

For architecture and data flow, see [ARCHITECTURE.md](./ARCHITECTURE.md). For features by role, see [FEATURES.md](./FEATURES.md). For screens and flows, see [DISPLAYS.md](./DISPLAYS.md).
