# WebWaka Production Suite

## Overview
WebWaka Production Suite is a manufacturing and production management vertical SaaS application, part of the WebWaka OS v4 ecosystem. Built with an Africa-First / Nigeria-First philosophy, it manages production orders, bill of materials, quality control, floor supervision tasks, and supply chain workflows for African manufacturing businesses.

## Architecture

- **Backend Runtime:** Cloudflare Workers (not running locally — deployed to Cloudflare edge)
- **API Framework:** Hono (TypeScript)
- **Frontend:** React 19 + Vite (static SPA, landing/overview page)
- **Primary DB:** Cloudflare D1 (SQLite at the edge)
- **Client-side DB:** Dexie.js (IndexedDB, offline-first sync)
- **Auth:** `@webwaka/core` (JWT, RBAC, CORS, rate limiting)
- **Payments:** Paystack (NGN kobo integers only) — fully implemented
- **AI:** OpenRouter via `webwaka-ai-platform` (vendor-neutral)
- **Package Manager:** npm

## Project Layout

```
webwaka-production/
├── index.html                      # Vite SPA entry point
├── vite.config.ts                  # Vite config (host 0.0.0.0, port 5000)
├── src/
│   ├── main.tsx                    # React entry point
│   ├── worker.ts                   # Cloudflare Worker entry point
│   ├── core/
│   │   ├── types.ts                # Domain types (ProductionOrder, BOM, QualityCheck, Task)
│   │   ├── paystack.ts             # Paystack client (NGN kobo, fully implemented)
│   │   └── ai-platform-client.ts  # AI platform proxy client
│   ├── db/db.ts                    # Dexie offline DB + mutation queue
│   ├── i18n/index.ts               # i18n (en-NG, en-GH, yo-NG, etc.)
│   ├── middleware/auth.ts          # Re-exports @webwaka/core auth primitives
│   └── modules/
│       ├── production-mgmt/        # PROD-001/002/003/004/008: Orders, BOM, QC, Tasks
│       ├── commerce-webhook/       # PROD-005: B2B event handler from webwaka-commerce
│       ├── data-retention/         # PROD-006: Archiving + retention policies
│       └── external-api/           # PROD-007: ERP/MES integration API (API key auth)
├── migrations/
│   ├── 001_production_schema.sql   # production_orders, bill_of_materials, quality_checks
│   └── 002_tasks_schema.sql        # production_tasks, archived_production_orders, commerce_webhook_events
└── package.json
```

## API Routes

### Internal API (JWT Auth via @webwaka/core)
| Method | Route | RBAC | Description |
|---|---|---|---|
| GET | `/api/production/mgmt/orders` | VIEWER+ | List orders (paginated, filterable) |
| GET | `/api/production/mgmt/orders/:id` | VIEWER+ | Get single order |
| POST | `/api/production/mgmt/orders` | FLOOR_SUPERVISOR+ | Create order (DRAFT) |
| PATCH | `/api/production/mgmt/orders/:id` | FLOOR_SUPERVISOR+ | Update order (status machine enforced) |
| DELETE | `/api/production/mgmt/orders/:id` | TENANT_ADMIN+ | Delete DRAFT/CANCELLED orders |
| GET | `/api/production/mgmt/orders/:id/bom` | VIEWER+ | List BOM items |
| POST | `/api/production/mgmt/orders/:id/bom` | PRODUCTION_MANAGER+ | Add BOM component |
| PATCH | `/api/production/mgmt/orders/:id/bom/:id` | FLOOR_SUPERVISOR+ | Update quantity used |
| GET | `/api/production/mgmt/orders/:id/quality` | VIEWER+ | List QC checks |
| POST | `/api/production/mgmt/orders/:id/quality` | QC_INSPECTOR+ | Record QC result |
| GET | `/api/production/mgmt/orders/:id/tasks` | VIEWER+ | List floor tasks |
| POST | `/api/production/mgmt/orders/:id/tasks` | FLOOR_SUPERVISOR+ | Create task |
| PATCH | `/api/production/mgmt/orders/:id/tasks/:id` | FLOOR_SUPERVISOR+ | Update task (auto start/end time) |
| GET | `/api/production/mgmt/tasks` | FLOOR_SUPERVISOR+ | Dashboard: all tasks |

### Commerce Webhooks (PROD-005)
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/production/webhooks/commerce` | Inter-service secret | Receive B2BSalesOrderPlaced events (idempotent) |
| GET | `/api/production/webhooks/events` | JWT TENANT_ADMIN+ | List/audit webhook events |
| POST | `/api/production/webhooks/events/:id/retry` | JWT TENANT_ADMIN+ | Retry failed events |

### Data Retention (PROD-006)
| Method | Route | RBAC | Description |
|---|---|---|---|
| POST | `/api/production/retention/archive` | TENANT_ADMIN+ | Archive orders >365 days old |
| GET | `/api/production/retention/archived` | TENANT_ADMIN+ | List archived orders |
| GET | `/api/production/retention/archived/:id` | TENANT_ADMIN+ | Get archived order |
| GET | `/api/production/retention/stats` | TENANT_ADMIN+ | Retention statistics |

### External ERP/MES API (PROD-007, API Key Auth, NOT JWT)
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/ext/v1/production/orders` | X-Api-Key | List orders (cursor pagination) |
| GET | `/ext/v1/production/orders/:id` | X-Api-Key | Get order with BOM, QC, tasks |
| POST | `/ext/v1/production/orders` | X-Api-Key | Create order from ERP |
| PUT | `/ext/v1/production/orders/:id/status` | X-Api-Key | Update status (machine enforced) |

## Status Transition Machine (PROD-008)
```
DRAFT → IN_PROGRESS → COMPLETED
DRAFT → CANCELLED
IN_PROGRESS → CANCELLED
```
Invalid transitions return HTTP 422.

## Development

```bash
npm install        # Install dependencies
npm run dev:ui     # Start Vite dev server (port 5000)
npm run typecheck  # TypeScript check
npm test           # Run Vitest tests (47 tests, all passing)
```

## Deployment

- **Frontend (Replit):** Static site — `npm run build:ui` → `dist/`
- **Backend (Cloudflare):** `npx wrangler deploy --env production`
- **D1 migrations:**
  ```bash
  npx wrangler d1 migrations apply webwaka-production-db-dev
  npx wrangler d1 migrations apply webwaka-production-db-staging --env staging
  npx wrangler d1 migrations apply webwaka-production-db-prod --env production
  ```

## Platform Invariants

1. Build Once Use Infinitely — auth from `@webwaka/core`, never re-implemented
2. Mobile First — lightweight Hono API, Dexie for offline PWA
3. PWA First — Cloudflare Workers + Pages ready
4. Offline First — Dexie IndexedDB mutation queue in `src/db/db.ts`
5. Nigeria First — Paystack kobo integers, en-NG default
6. Africa First — i18n stubs for multiple African locales
7. Vendor Neutral AI — OpenRouter via `webwaka-ai-platform`

## Security Model

- `tenantId` is ALWAYS sourced from validated JWT — never from headers/body/params
- Every D1 query includes `WHERE tenant_id = ?` binding
- RBAC roles: `SUPER_ADMIN`, `TENANT_ADMIN`, `PRODUCTION_MANAGER`, `FLOOR_SUPERVISOR`, `QC_INSPECTOR`, `VIEWER`
- JWT secret: `wrangler secret put JWT_SECRET` (never in wrangler.toml)
- API keys for external ERP stored in SESSIONS_KV (provisioned by webwaka-super-admin-v2)
- Inter-service secret: set as `INTER_SERVICE_SECRET` env var

## Cross-Repo Dependencies

- `@webwaka/core`: Auth, RBAC, CORS, rate limiting (DO NOT re-implement)
- `webwaka-commerce`: Sends `B2BSalesOrderPlaced` events via webhook
- `webwaka-central-mgmt`: Data retention policies, financial ledger
- `webwaka-ai-platform`: AI completions (via `src/core/ai-platform-client.ts`)
- `webwaka-super-admin-v2`: Tenant provisioning, API key management
