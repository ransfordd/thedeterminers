# Production deployment (Coolify)

## Safe redeploy — data is preserved

A normal **Redeploy** on Coolify:

- Rebuilds the **app** container with new code
- Runs **`npx prisma db push`** on startup (schema sync only — adds columns/enums; does **not** delete rows)
- Does **not** wipe clients, loans, transactions, or accounts

PostgreSQL data lives in the **`susu_pgdata`** volume ([`docker-compose.yml`](../docker-compose.yml)). As long as that volume is not deleted, redeploys keep all data.

### What would wipe data (never do on production)

| Action | Result |
|--------|--------|
| `docker compose down -v` | Deletes Postgres volume — **full data loss** |
| Deleting the Postgres volume in Coolify | **Full data loss** |
| `npm run db:docker-reset` | Same as `down -v` — **local dev only** |
| Changing `DATABASE_URL` to a new empty database | App looks empty (data still on old DB) |

---

## Pre-deploy checklist (Coolify)

### 1. PostgreSQL persistence

**If using bundled compose** (`app`, `postgres`, `redis`):

- Open the **postgres** service in Coolify
- Confirm a volume is mounted at `/var/lib/postgresql/data` (compose name: `susu_pgdata`)
- Do **not** delete that volume when redeploying

**If using external Postgres:**

- Confirm app `DATABASE_URL` still points to the **same** database as before

### 2. App startup command

The **app** service should run (from compose):

```sh
npx prisma db push && exec node server.js
```

It should **not** include `prisma db seed`, `migrate reset`, or `docker compose down -v`.

Seed is **manual only** — first install or via **Admin → System Settings → Run seed now**. Re-seed upserts default settings/users; it does not delete live clients or transactions.

### 3. Optional backup before major deploys

From a machine that can reach Postgres:

```bash
pg_dump "$DATABASE_URL" -Fc -f thedeterminers-backup-$(date +%Y%m%d).dump
```

Or use Coolify’s backup feature if configured.

### 4. Deploy

1. Push to GitHub (`main` or your deploy branch)
2. In Coolify: **Redeploy** the resource — do **not** delete and recreate the resource or Postgres volume
3. Watch **app logs** for `prisma db push` success and `Ready` / server start

### 5. Post-deploy smoke test

- [ ] Site loads (e.g. https://thedeterminers.com)
- [ ] Admin login works
- [ ] **Client Management** — existing clients still listed
- [ ] **Transactions** or **Active Loans** — known records still visible
- [ ] Optional: two clients with the **same phone** can each log in via the account picker

### User.phone and shared numbers

`User.phone` is **not** unique in the Prisma schema. Multiple accounts may share one phone. If signup ever fails on duplicate phone on production, check for a manual unique index:

```sql
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'User' AND indexdef ILIKE '%phone%';
```

Drop any unique index on `phone` if present. Login uses an account picker when several users share a number.

---

## Environment variables (app service)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection (must stay stable across redeploys) |
| `NEXTAUTH_URL` | Public site URL (e.g. `https://thedeterminers.com`) |
| `NEXTAUTH_SECRET` | Auth signing secret — **do not change** casually or sessions break |

## Uploads persistence

Profile pictures live under `/app/public/uploads`. Mount a persistent volume there in Coolify or uploads disappear on container restart (DB paths remain but files may be missing).

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Empty clients/transactions | Wrong `DATABASE_URL` or new empty DB |
| Login fails for everyone | `NEXTAUTH_SECRET` or `NEXTAUTH_URL` changed incorrectly |
| App crash on start | `db push` failed — check logs; data usually intact |
| Seed demo users appear | Someone ran seed manually — does not remove real clients |
