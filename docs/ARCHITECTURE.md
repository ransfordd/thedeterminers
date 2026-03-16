# Architecture

## High-level flow

- **Client:** Server Components, React Hook Form + Zod, Framer Motion, TanStack Query.
- **Next.js:** App Router, Server Actions, Route Handlers, Auth.js (session in Redis).
- **Server:** Prisma (PostgreSQL), business engines in `lib/engines/` (susu-cycle, loan, etc.).

Auth and Route Handlers use Redis for session store and rate limiting.

## Auth and roles

- **Auth.js** with Credentials (or existing user table). Role stored in session.
- **Middleware** protects routes by role: `/admin/*` → business_admin, `/agent/*` → agent, `/client/*` → client, `/manager/*` → manager. Unauthenticated → `/login`; wrong role → dashboard home.
- **Session store:** Redis (shared across instances, survives restarts).
- **Session timeout:** Configurable (e.g. from `system_settings` or env); enforced in Auth callbacks or middleware.

## How server logic is used

- **Server Actions:** Mutations (record collection, submit loan application, update settings). Validate with Zod; call engines in `lib/engines/`.
- **Route Handlers:** REST-style or webhook endpoints (e.g. CSV export, receipts). Also call engines; rate-limiting backed by Redis.
- **Engines:** Core business logic (e.g. `lib/engines/susu-cycle.ts`, `lib/engines/loan.ts`). No HTTP; used only by Server Actions and Route Handlers.

## Key files (to be added as the app is built)

- `middleware.ts` – Role-based route protection
- `lib/auth.ts` or Auth.js config – Session, Redis adapter, callbacks
- `lib/db.ts` or Prisma client – Single instance, used by engines and actions
- `lib/engines/susu-cycle.ts` – Susu cycle creation, collections, payout
- `lib/engines/loan.ts` – Loan approval, repayments, penalties
- `app/api/*` – Route Handlers (export, receipts, etc.)

Update this doc as you add or rename these modules.

## Local development

PostgreSQL and Redis can run locally via **Docker** (`docker-compose.yml`). Start them with `docker compose up -d` from `next-app`, then run the app with `npm run dev`. See the main [README](../README.md#run-locally-recommended-docker-for-postgres--redis) for full steps. When testing is done, deploy to your online host and configure production env vars there.
