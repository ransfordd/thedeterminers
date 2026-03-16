# API (Route Handlers and public endpoints)

This document lists Route Handlers and any public API so a reader knows method, path, auth, and request/response shape. Update it when adding or changing endpoints.

## Convention

- **Auth:** Unless noted, endpoints require an authenticated session; role may be restricted (e.g. admin-only).
- **Request/response:** JSON unless stated (e.g. CSV, PDF, HTML for receipts/exports).

## Endpoints (to be added as built)

### Export and receipts

| Method | Path (example) | Auth | Description |
|--------|----------------|------|-------------|
| GET | `/api/export/csv?type=agent_commission&start=YYYY-MM-DD&end=YYYY-MM-DD` | Admin or manager | CSV download for agent commission in date range. |
| GET | `/api/receipts/susu?receipt=...` | Authenticated (owner or agent) | Susu receipt (PDF or HTML). |
| GET | `/api/receipts/loan?receipt=...` | Authenticated (owner or agent) | Loan receipt (PDF or HTML). |

### Notifications

| Method | Path (example) | Auth | Description |
|--------|----------------|------|-------------|
| POST | `/api/notifications/mark-read` | Authenticated | Mark notification(s) as read; body: `{ ids: number[] }`. |
| GET | `/api/notifications` | Authenticated | List notifications for current user (optional query: unread only). |

### Future API (placeholders)

- Login / logout: handled by Auth.js and Server Actions, not necessarily as REST.
- Server Actions for mutations (collections, loan applications, settings) are not listed here; document them in FEATURES.md and FUNCTIONS.md.

---

*Add new Route Handlers to this table with method, path, auth, and a short description. Optionally add request/response schemas (e.g. Zod or OpenAPI) later.*
