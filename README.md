# Susu System – Next.js 14 (App Router) Migration

This folder contains the new application built with:

- **Next.js 16** (App Router), **TypeScript**, **React 18**
- **Tailwind CSS**, **Framer Motion**
- **Public site:** Home (`/`), About Us (`/about`), Contact Us (`/contact`), News (`/news`) with shared header and footer
- **PostgreSQL** + **Prisma**, **Redis** (session store, rate limiting, cache)
- **Auth.js**, **Zod**, **React Hook Form**, **TanStack Query**

See the migration plan in the repo (`.cursor/plans/`) for architecture and rollout.

**Security:** Keep Next.js and dependencies on patched versions. Run `npm audit` and `npm audit fix` (or `npm audit fix --force` for major upgrades) after dependency changes.

## Structure

- `app/` – Routes and layouts: `(auth)`, `(dashboard)` with admin/agent/client/manager, `api/`
- `components/` – Reusable UI and role-specific components
- `lib/` – Shared logic, engines (susu, loan), auth helpers, db client
- `prisma/` – Schema and migrations (PostgreSQL)
- `public/` – Static assets
- `styles/` – Global CSS and Tailwind

## Run locally (recommended: Docker for Postgres + Redis)

Use this workflow to run everything on your machine for testing; when satisfied, deploy to your online host.

1. **Start PostgreSQL and Redis (Docker)**  
   From this folder (`next-app`):
   ```bash
   docker compose up -d
   ```
   Postgres is on `localhost:5433` (port 5433 to avoid conflict with local PostgreSQL on 5432), Redis on `localhost:6379`. Credentials match `.env.example` below.

2. **Environment**  
   Copy `.env.example` to `.env` and set:
   - `DATABASE_URL="postgresql://susu:susu_local@localhost:5433/susu_system?schema=public"` (already correct for Docker above)
   - `NEXTAUTH_URL="http://localhost:3000"`
   - `NEXTAUTH_SECRET` to any long random string (e.g. `openssl rand -base64 32`)

3. **Install, migrate, seed**
   ```bash
   npm install
   npm run db:push
   npm run db:seed
   ```

4. **Run the app**
   ```bash
   npm run dev
   ```
   Open **http://localhost:3000**.

### Default login credentials (after `npm run db:seed`)

After running `npx prisma db seed` (or `npm run db:seed`), you can sign in with these accounts:

| Role    | Email                 | Password   |
|---------|-----------------------|------------|
| Admin   | admin@example.com     | admin123   |
| Manager | manager@example.com   | manager123 |
| Agent   | agent@example.com     | agent123   |
| Client  | client@example.com    | client123  |

You can log in with either **email** or **username** (e.g. the email above, or the username set in seed). Re-running seed resets the admin password to `admin123`. Override defaults with env vars: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, etc.

5. **When you’re done testing**  
   Stop containers: `docker compose down`. To deploy online, push your code and set production env vars (and a production Postgres/Redis) on your host.

### Seed fails: "credentials for susu are not valid"

PostgreSQL was likely initialized earlier with different credentials (e.g. an old Docker volume). Reset the database so it re-initializes with the credentials from `docker-compose.yml`:

```bash
docker compose down -v
docker compose up -d
npx prisma db push
npx prisma db seed
```

`-v` removes the Postgres volume so the next `up` creates a fresh database with user `susu` and password `susu_local`. Ensure your `.env` has:

`DATABASE_URL="postgresql://susu:susu_local@localhost:5433/susu_system?schema=public"`

### NextAuth: `[next-auth][error][CLIENT_FETCH_ERROR]` / "Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"

The client is receiving HTML instead of JSON from `/api/auth/session`. Fixes:

1. **Set `NEXTAUTH_URL`** in `.env` to the exact URL you use (e.g. `http://localhost:3000`). Do not use a trailing slash.
2. Ensure **`NEXTAUTH_SECRET`** is set (required for production and recommended for dev).
3. Restart the dev server after changing `.env`.
4. If you use a custom domain or proxy, ensure `/api/auth/*` is not rewritten to an HTML page.

---

## Setup without Docker

If you already have PostgreSQL (and optionally Redis) installed:

1. **Install dependencies:** `npm install`
2. **Environment:** Copy `.env.example` to `.env` and set `DATABASE_URL` to your Postgres URL, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`. Optionally set Redis URLs for rate limiting / session store.
3. **Database:** Create the DB, then run `npm run db:push` or `npm run db:migrate`.
4. **Seed:** `npm run db:seed` (default admin: `admin@example.com` / `admin123`; override with `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`).
5. **Run:** `npm run dev` and open `http://localhost:3000`.

## Documentation

Project documentation lives in **`docs/`** so anyone can understand the project, its functions, and its displays:

- [**OVERVIEW.md**](docs/OVERVIEW.md) – What the system does, tech stack, folder structure
- [**ARCHITECTURE.md**](docs/ARCHITECTURE.md) – Data flow, auth, Server Actions vs Route Handlers vs engines
- [**FEATURES.md**](docs/FEATURES.md) – Features by role (admin, manager, agent, client)
- [**DISPLAYS.md**](docs/DISPLAYS.md) – Main screens and flows with routes
- [**API.md**](docs/API.md) – Route Handlers and public endpoints
- [**FUNCTIONS.md**](docs/FUNCTIONS.md) – Key business logic and engines (index; use TSDoc in code for details)

Keep these docs updated as you add features, screens, or APIs.
