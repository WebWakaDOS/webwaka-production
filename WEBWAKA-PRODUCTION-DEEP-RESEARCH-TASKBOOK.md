# WEBWAKA-PRODUCTION — DEEP RESEARCH + ENHANCEMENT TASKBOOK

**Repository:** `webwaka-production`
**Ecosystem:** WebWaka OS v4 — Multi-Repo Platform Architecture
**Prepared:** 2026-04-04
**Vertical:** Manufacturing & Production Management (Nigeria / Africa)
**Status:** Scaffold stage — no live D1 queries, multiple stubs

---

## TABLE OF CONTENTS

1. [Repo Deep Understanding](#1-repo-deep-understanding)
2. [External Best-Practice Research](#2-external-best-practice-research)
3. [Synthesis & Gap Analysis](#3-synthesis--gap-analysis)
4. [Top 20 Enhancements + Bug Fixes](#4-top-20-enhancements--bug-fixes)
5. [Task Breakdown](#5-task-breakdown)
6. [QA Plans](#6-qa-plans)
7. [Implementation Prompts](#7-implementation-prompts)
8. [QA Prompts](#8-qa-prompts)
9. [Priority Order & Dependency Map](#9-priority-order--dependency-map)
10. [Phase 1 / Phase 2 Split](#10-phase-1--phase-2-split)
11. [Repo Context & Ecosystem Notes](#11-repo-context--ecosystem-notes)
12. [Governance & Reminder Block](#12-governance--reminder-block)
13. [Execution Readiness Notes](#13-execution-readiness-notes)

---

## 1. REPO DEEP UNDERSTANDING

### 1.1 Repository Identity

| Field | Value |
|---|---|
| **Repo name** | `webwaka-production` |
| **NPM package** | `webwaka-production` v1.0.0 |
| **Language** | TypeScript (strict, ESNext, nodenext modules) |
| **Runtime target** | Cloudflare Workers |
| **Frontend** | React 19 + Vite 8 (SPA, port 5000) |
| **Backend** | Hono v4 on Cloudflare Workers |
| **Database** | Cloudflare D1 (SQLite at edge) |
| **Offline DB** | Dexie v4 (IndexedDB, client-side) |
| **Auth** | `@webwaka/core` JWT + RBAC |
| **Payments** | Paystack (kobo-only, stub) |
| **AI** | OpenRouter via `@webwaka/core` AIEngine (stub) |
| **Package manager** | npm (package-lock.json present) |

### 1.2 Project Structure (Full)

```
webwaka-production/
├── .github/
│   └── workflows/
│       └── deploy.yml          # 5-layer CI/CD pipeline (typecheck → test → staging → prod → healthcheck)
├── migrations/
│   └── 001_production_schema.sql  # D1 schema: production_orders, bill_of_materials, quality_checks
├── src/
│   ├── core/
│   │   ├── ai.ts               # OpenRouter AIClient class — STUB (throws errors)
│   │   ├── paystack.ts         # PaystackClient class — STUB (throws errors)
│   │   └── types.ts            # Shared domain types, PRODUCTION_CONSTANTS, ProductionBindings
│   ├── db/
│   │   └── db.ts               # Dexie offline DB (WebWakaProductionDB) + mutation queue helpers
│   ├── i18n/
│   │   └── index.ts            # 7-locale i18n system, kobo formatters, NIGERIAN_STATES list
│   ├── middleware/
│   │   └── auth.ts             # Re-exports from @webwaka/core + PRODUCTION_ROLES constants
│   ├── modules/
│   │   └── production-mgmt/
│   │       ├── index.ts        # Hono router: 8 endpoints, ALL with D1 queries commented out
│   │       └── index.test.ts   # 16 unit tests (RBAC, input validation, tenant isolation)
│   ├── App.tsx                 # React dashboard UI (added during Replit setup)
│   ├── app.css                 # Dark-theme CSS
│   ├── main.tsx                # React app entry
│   └── worker.ts               # Hono entry point — CORS, JWT auth, rate limit, routes
├── index.html                  # Vite HTML entry (added during Replit setup)
├── tsconfig.json               # Worker TS config (Cloudflare Workers types, nodenext)
├── tsconfig.app.json           # Frontend TS config (browser types, bundler)
├── vite.config.ts              # Vite dev server (0.0.0.0:5000, allowedHosts: all)
├── vitest.config.ts            # Vitest config (30% line threshold, 80% function/branch)
├── wrangler.toml               # CF Workers config (D1, KV, env vars)
├── package.json                # Scripts: dev:ui, build:ui, typecheck, test, deploy
├── package-lock.json
├── CHANGELOG.md
└── README.md
```

### 1.3 Current Module Capabilities

#### 1.3.1 Production Management Router (`/api/production/mgmt`)

| Endpoint | Method | RBAC | D1 Implemented? |
|---|---|---|---|
| `/orders` | GET | VIEWER+ | ❌ Returns empty array |
| `/orders` | POST | FLOOR_SUPERVISOR+ | ❌ Returns mock object |
| `/orders/:id` | PATCH | FLOOR_SUPERVISOR+ | ❌ Returns mock success |
| `/orders/:id` | DELETE | TENANT_ADMIN+ | ❌ Returns mock success |
| `/orders/:orderId/bom` | GET | VIEWER+ | ❌ Returns empty array |
| `/orders/:orderId/bom` | POST | PRODUCTION_MANAGER+ | ❌ Returns mock object |
| `/orders/:orderId/quality` | GET | VIEWER+ | ❌ Returns empty array |
| `/orders/:orderId/quality` | POST | QC_INSPECTOR+ | ❌ Returns mock object |

**Critical finding:** Not a single D1 query is live. Every endpoint returns mock/empty data. The system is a scaffold only.

#### 1.3.2 Cloudflare D1 Schema (migrations/001)

Tables present:
- `production_orders` — 15 columns, proper tenant_id, CHECK constraints on status
- `bill_of_materials` — FK to production_orders (CASCADE DELETE)
- `quality_checks` — FK to production_orders (CASCADE DELETE)

**Missing from schema:**
- `audit_log` table
- `inventory_items` table
- `production_runs` table (sub-division of orders)
- `production_comments` table
- Version/revision tracking on BOM
- Cost fields on BOM items
- Defect classification on quality_checks
- `sync_log` table for offline sync tracking

#### 1.3.3 @webwaka/core — Available but Unused Capabilities

The installed `@webwaka/core` package exposes many sub-modules that this repo does not use:

| Sub-module | Export Path | Used in repo? |
|---|---|---|
| Auth/JWT | `@webwaka/core` | ✅ Used |
| RBAC | `@webwaka/core/rbac` | ✅ Partially used |
| Billing | `@webwaka/core/billing` | ❌ Not imported |
| Structured Logger | `@webwaka/core/logger` | ❌ Not imported (console.error used directly) |
| Events/PubSub | `@webwaka/core/events` | ❌ Not imported |
| Notifications | `@webwaka/core/notifications` | ❌ Not imported |
| AI Engine | `@webwaka/core/ai` | ❌ Not imported (local AIClient stub used instead) |
| KYC | `@webwaka/core/kyc` | ❌ Not imported |
| Geolocation | `@webwaka/core/geolocation` | ❌ Not imported |
| Document | `@webwaka/core/document` | ❌ Not imported |
| Chat | `@webwaka/core/chat` | ❌ Not imported |
| Booking | `@webwaka/core/booking` | ❌ Not imported |

**Critical finding:** The local `src/core/ai.ts` duplicates (and stubs) functionality that `@webwaka/core/ai` already provides. This violates Invariant 1 (Build Once Use Infinitely).

#### 1.3.4 Known Bugs

| Bug | Location | Severity |
|---|---|---|
| `console.error` used in `worker.ts` | src/worker.ts:107 | Medium — CI console.log check doesn't catch `console.error` but structured logging should be used |
| D1 `quantity` field is `REAL` (float) | migrations/001 | High — float arithmetic errors in manufacturing quantities |
| `order_number` uses `Date.now()` only | production-mgmt/index.ts | High — race conditions in concurrent inserts, no uniqueness guarantee |
| Line coverage threshold is 30% | vitest.config.ts | High — CHANGELOG claims >90% target but config allows 30% |
| No `GET /orders/:id` endpoint | production-mgmt/index.ts | High — individual order retrieval missing |
| No input validation library | production-mgmt/index.ts | High — only manual `if (!body.x)` checks |
| CORS wildcard origin not in dev mode | worker.ts | Medium — localhost:5000 allowed but no wildcard for dev |
| `WAREHOUSE_STAFF` role defined in auth.ts but not in RBAC guards | auth.ts vs index.ts | Medium — role exists but has no access |
| Local AI client stub violates Invariant 1 | src/core/ai.ts | Medium — should use @webwaka/core/ai |
| Paystack client never instantiated in routes | src/core/paystack.ts | Low — stub exists but nothing calls it |
| No `updated_at` trigger in D1 | migrations/001 | Medium — updated_at must be set manually on every UPDATE |
| No `GET /orders/:orderId/bom/:itemId` endpoint | — | Medium — no individual BOM item retrieval |
| Test mock passes `user.role` but module reads `c.get('tenantId')` | index.test.ts | Low — tenantId set correctly but tests don't verify cross-tenant isolation |

#### 1.3.5 CI/CD Pipeline

The `.github/workflows/deploy.yml` is well-structured with a 5-layer approach:
1. TypeScript strict check
2. Unit tests with coverage
3. Staging deploy (develop branch)
4. Production deploy (main branch)
5. Health check post-deploy

**Gaps in CI:**
- No E2E tests (marked TODO for PROD-2 epic)
- No Playwright step
- No lint step (ESLint not configured)
- No security audit step (`npm audit`)
- No OpenAPI spec validation
- `console.log` check only (not `console.error` or `console.warn`)
- No migration dry-run on PRs (migrations only applied on deploy)

#### 1.3.6 Offline Architecture State

`src/db/db.ts` defines a complete Dexie schema with mutation queuing. However:
- No sync trigger mechanism exists
- No background sync service worker
- No API endpoint to accept batch sync payloads
- No conflict resolution logic
- No retry-with-backoff implementation

### 1.4 Dependencies on Other WebWaka Repos

This repo explicitly depends on:
- **`@webwaka/core`** v1.3.2 — platform auth, RBAC, logging, events, AI, notifications, billing
- **webwaka-super-admin-v2** (implied) — tenant provisioning, user management, JWT issuance, RBAC schema management
- **webwaka-inventory** (implied from PROD-2 roadmap) — inventory integration
- **WebWaka Events Bus** (via `@webwaka/core/events`) — cross-repo event publishing

**This repo does NOT own:**
- Tenant creation or user registration
- JWT signing (only JWT validation)
- Global RBAC schema management
- Cross-vertical reporting/analytics

---

## 2. EXTERNAL BEST-PRACTICE RESEARCH

### 2.1 Manufacturing Production Order Management (MES Best Practices)

**Market context:** MOM software market was $17.46B in 2024, growing at 19.1% CAGR. Leading MES platforms (SAP ME, Siemens Opcenter, Plex, Katana MRP) set the following standards:

**Must-have features (world-class benchmark):**
1. **Real-time production order status dashboard** — Gantt/Kanban view, live status updates
2. **Multi-level Bill of Materials (MBOM)** — hierarchical BOM, version control, cost rollup
3. **Work-in-Progress (WIP) tracking** — quantity produced vs. planned at each stage
4. **Yield and scrap tracking** — actual yield vs. expected, waste recording by reason code
5. **Non-Conformance Reports (NCR)** — ISO 9001 defect classification, corrective actions
6. **Production scheduling with capacity constraints** — Gantt, forward/backward scheduling
7. **Operator/shift assignment** — who worked what shift on which order
8. **Material consumption recording** — actual vs. planned BOM quantities
9. **Audit trail** — every state transition logged with user, timestamp, reason
10. **Batch/lot tracking** — traceability for regulated industries (food, pharma)
11. **Production KPIs** — OEE (Overall Equipment Effectiveness), cycle time, throughput

**Nigeria-specific requirements (from research):**
- Energy cost tracking (energy = ~40% of Nigerian manufacturing cost)
- NAFDAC compliance fields for food/pharma manufacturing
- Multi-currency support (NGN primary, USD for imports)
- USSD/bank transfer payment support (unbanked suppliers)
- Low-bandwidth optimizations (intermittent internet, power outages)
- Generator fuel consumption as a production cost input

### 2.2 Cloudflare Workers + D1 Best Practices

- **Prepared statements** — use `.prepare().bind()`, never string interpolation (SQL injection prevention)
- **Batch queries** — use `c.env.DB.batch([...])` for atomic multi-table operations
- **Row count** — use `SELECT COUNT(*) as count` in a separate query (D1 doesn't support `RETURNING COUNT()`)
- **Integer quantities** — store manufacturing quantities as INTEGER × 1000 (milli-units) to avoid float errors
- **Tenant isolation testing** — every test must verify that tenant A cannot access tenant B's data
- **D1 `last_insert_rowid()`** — returns auto-increment; use UUIDs for distributed safety
- **Indexes** — compound index on `(tenant_id, created_at DESC)` is the most critical pattern
- **Error handling** — D1 throws `D1Error` on constraint violations; catch and return 409 Conflict

### 2.3 Hono Input Validation Best Practices

**Standard pattern in the Hono ecosystem:**
```typescript
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const createOrderSchema = z.object({
  productName: z.string().min(1).max(255),
  quantity: z.number().positive().int(),
  unit: z.string().min(1).max(50),
});

router.post('/orders', zValidator('json', createOrderSchema), async (c) => { ... });
```

**Benefits over manual `if (!body.x)` checks:**
- Automatic 422 response with field-level error messages
- TypeScript type inference from schema
- OpenAPI schema generation support via `@hono/zod-openapi`

### 2.4 Offline-First PWA Best Practices (Dexie + Service Worker)

**Architecture layers:**
1. **Vite PWA Plugin** (`vite-plugin-pwa`) — generates service worker with Workbox, handles manifest
2. **Network-first for API calls** — try API, fall back to Dexie cache
3. **Optimistic UI** — write to Dexie immediately, enqueue mutation, show success to user
4. **Background sync** — when online, flush mutation queue using `navigator.serviceWorker` + `Background Sync API`
5. **Conflict resolution** — last-write-wins per tenant (simplest correct approach for manufacturing)
6. **Retry with exponential backoff** — failed syncs retry at 2s, 4s, 8s, 16s, max 5 retries

**Nigeria-specific PWA requirements:**
- Small app shell (< 100KB) for 2G/3G users
- Cache-Control headers for static assets
- Data-saver mode detection
- App install banner for Android (most common OS in Nigeria)

### 2.5 Bill of Materials Best Practices

**BOM types in world-class MES:**
- **Engineering BOM (EBOM)** — designed by engineering
- **Manufacturing BOM (MBOM)** — adjusted for production reality (this repo's focus)
- **Costing BOM** — with unit costs per component

**Best practices:**
- BOM versioning (revision control) — production order links to a specific BOM version
- Cost rollup — sum of `quantity_required × unit_cost` for each BOM item
- SKU validation against inventory catalog
- Unit-of-measure (UOM) conversion tracking
- Substitution rules — alternate components when primary is out of stock

### 2.6 Quality Control / ISO 9001 Best Practices

**ISO 9001 QMS digital requirements:**
- Non-conformance records (NCR) with disposition workflow (rework, scrap, use-as-is)
- Corrective Action / Preventive Action (CAPA) tracking
- Control plan linkage (which checks are mandatory for which products)
- Statistical Process Control (SPC) — control charts, Cp/Cpk tracking
- Inspector certification tracking
- Hold/quarantine status for failing lots

**For Nigerian manufacturing:**
- NAFDAC compliance checkpoints for food/pharma
- SON (Standards Organization of Nigeria) reference standards
- FEPA environmental compliance checks

### 2.7 Event-Driven Architecture for Manufacturing

**Best practice:** Every significant state transition emits an event to a shared event bus:
```
ProductionOrderCreated { orderId, tenantId, createdBy, timestamp }
ProductionOrderStatusChanged { orderId, tenantId, fromStatus, toStatus, changedBy }
QualityCheckFailed { orderId, tenantId, checkId, defectType, severity }
BOMItemConsumed { orderId, tenantId, componentSku, quantityUsed, wasteQuantity }
```

**Benefits:** enables cross-repo notifications, analytics, reorder triggers to inventory, audit trail.

### 2.8 Structured Logging Best Practices (Cloudflare Workers)

- Use `@webwaka/core/logger` (already available) — do not use `console.error` directly
- Structured JSON logs: `{ level, message, tenantId, orderId, duration, timestamp }`
- Log request ID for distributed tracing
- Never log JWT tokens or secrets

---

## 3. SYNTHESIS & GAP ANALYSIS

### 3.1 Critical Gaps (Blockers for Production Use)

| Gap | Impact | Priority |
|---|---|---|
| All 8 D1 database queries are stubs — no data persists | System is non-functional | P0 |
| No input validation library (Zod) — security and reliability risk | SQL injection via Hono routes | P0 |
| No `GET /orders/:id` endpoint — can't retrieve a single order | Incomplete REST API | P0 |
| No sync endpoint for offline mutation queue | Offline-first is broken | P1 |
| Local AI stub duplicates @webwaka/core/ai (violates Invariant 1) | Technical debt | P1 |
| No structured logging (@webwaka/core/logger not used) | Observability broken | P1 |

### 3.2 Architecture Gaps

| Gap | Category |
|---|---|
| No event publishing (@webwaka/core/events not used) | Event-driven |
| No push notifications (@webwaka/core/notifications not used) | Notifications |
| No PWA service worker or manifest | PWA/Offline |
| No audit_log table in D1 schema | Compliance |
| BOM has no cost fields (kobo per unit) | Business feature |
| Quality checks have no defect classification | Business feature |
| No production KPIs endpoint | Analytics |
| No export (PDF/Excel) for production orders | Operations |
| No PATCH /orders/:id/status (status transition only) endpoint | API design |
| No GET /orders/:orderId/bom/:itemId endpoint | API completeness |

### 3.3 Code Quality Gaps

| Gap | Location |
|---|---|
| Line coverage threshold is 30% (CHANGELOG claims >90%) | vitest.config.ts |
| `quantity` stored as REAL (float) in D1 — precision errors | migrations/001 |
| `order_number` uses `Date.now()` — concurrent collision risk | production-mgmt/index.ts |
| `console.error` in worker.ts — should use structured logger | src/worker.ts |
| No ESLint configuration | — |
| No security audit in CI | .github/workflows/deploy.yml |

### 3.4 Nigeria / Africa Context Gaps

| Gap | Relevance |
|---|---|
| No energy cost input per production order | ~40% of Nigerian manufacturing cost |
| No NAFDAC / SON compliance fields | Regulatory |
| No USSD payment channel for supplier payments | Paystack unbanked support |
| No offline performance optimization (data-saver mode) | 3G/poor connectivity |
| Yoruba/Hausa/Igbo UI translation stubs never populated | i18n completeness |

---

## 4. TOP 20 ENHANCEMENTS + BUG FIXES

### Enhancement List (Priority Order)

| # | Title | Type | Priority |
|---|---|---|---|
| E01 | Implement all 8 D1 database queries in production-mgmt | Feature | P0 |
| E02 | Add Zod schema validation to all API endpoints | Security/Quality | P0 |
| E03 | Add `GET /orders/:id` single-order retrieval endpoint | API | P0 |
| E04 | Add audit_log table and emit audit events on every state change | Compliance | P1 |
| E05 | Implement Paystack client (initializePayment + verifyPayment) | Feature | P1 |
| E06 | Implement OpenRouter AI client via @webwaka/core/ai (replace local stub) | Invariant | P1 |
| E07 | Add structured logging via @webwaka/core/logger (replace console.error) | Observability | P1 |
| E08 | Add offline sync API endpoint (`POST /api/production/mgmt/sync`) | Offline-First | P1 |
| E09 | Implement PWA manifest and service worker via vite-plugin-pwa | PWA | P1 |
| E10 | Add cost fields to BOM (unit_cost_kobo) and cost rollup to production order | Business | P2 |
| E11 | Add defect classification to quality_checks (defect_type, severity, NCR) | Quality/ISO 9001 | P2 |
| E12 | Add production KPIs endpoint (OEE, yield, cycle time, QC pass rate) | Analytics | P2 |
| E13 | Add event publishing via @webwaka/core/events for all state changes | Event-Driven | P2 |
| E14 | Add energy cost tracking field to production orders (Nigerian context) | Nigeria-First | P2 |
| E15 | Raise test coverage threshold to 80% lines and add D1 integration tests | Quality | P2 |
| E16 | Add ESLint configuration with TypeScript rules | Code Quality | P2 |
| E17 | Add PDF/Excel export endpoint for production orders | Operations | P3 |
| E18 | Add BOM versioning (revision control) to schema and endpoints | Data Integrity | P3 |
| E19 | Add PATCH /orders/:id/status endpoint (status machine with validation) | API | P3 |
| E20 | Add Playwright E2E tests for the React UI | Testing | P3 |

### Bug Fix List

| # | Bug | Fix |
|---|---|---|
| B01 | D1 `quantity` is REAL — use INTEGER (milli-units × 1000) | Schema migration 002 |
| B02 | `order_number` collision risk — use `PO-{tenantId[:6]}-{timestamp}-{uuid[:6]}` | production-mgmt/index.ts |
| B03 | Line coverage threshold 30% vs. stated 90% target | vitest.config.ts |
| B04 | `WAREHOUSE_STAFF` role has no route access defined | auth.ts + production-mgmt |
| B05 | console.error in worker.ts — replace with @webwaka/core/logger | worker.ts |
| B06 | Local AI stub violates Invariant 1 — delete src/core/ai.ts, use @webwaka/core/ai | src/core/ai.ts |
| B07 | No `updated_at` trigger in D1 — every UPDATE must manually set updated_at | All UPDATE queries |
| B08 | No HTTP 404 returned when PATCH/DELETE target doesn't exist | production-mgmt/index.ts |

---

## 5. TASK BREAKDOWN

---

### TASK E01 — Implement All D1 Database Queries

**Title:** Implement all 8 D1 database queries in production-mgmt module

**Objective:** Replace all commented-out TODO stubs in `src/modules/production-mgmt/index.ts` with live Cloudflare D1 queries using prepared statements. All queries must enforce tenant isolation via `WHERE tenant_id = ?` bound from the JWT.

**Why it matters:** Without this, the entire system stores nothing. Every write returns a mock, and every read returns empty. This is the single highest-priority task that unlocks all other work.

**Repo scope:** `webwaka-production` only

**Dependencies:**
- Bug B01 (quantity as INTEGER) should be resolved in migration 002 before this task
- Bug B02 (order_number generation) should be resolved here

**Prerequisites:**
- Cloudflare D1 database provisioned with migration 001 applied
- `wrangler.toml` DB binding confirmed
- Bug B07 (updated_at) resolved alongside this task

**Impacted modules:** `src/modules/production-mgmt/index.ts`

**Likely files to change:**
- `src/modules/production-mgmt/index.ts` — implement all 8 D1 queries
- `migrations/002_fix_quantity_type.sql` — change REAL to INTEGER (milli-units)

**Expected output:**
- All 8 endpoints persist and retrieve real data from D1
- Pagination returns accurate total counts
- Tenant isolation enforced at SQL level on every query
- `updated_at` set correctly on every UPDATE

**Acceptance criteria:**
- [ ] `POST /orders` creates a record retrievable by `GET /orders`
- [ ] `PATCH /orders/:id` updates the record; non-existent ID returns 404
- [ ] `DELETE /orders/:id` removes record; subsequent GET returns 404
- [ ] `GET /orders` paginates correctly with `?page=2&pageSize=5`
- [ ] Tenant A cannot see Tenant B's orders (cross-tenant test)
- [ ] BOM items correctly linked to their production order
- [ ] Quality checks correctly linked to their production order
- [ ] All D1 queries use `.prepare().bind()` — no string interpolation

**Tests required:**
- Unit: mock D1 and verify correct SQL called with correct bindings
- Integration: real D1 in Miniflare/Wrangler test environment
- Tenant isolation: create order as tenant A, retrieve as tenant B → 0 results

**Risks:**
- D1 batch operations may fail silently — test all edges
- SQLite REAL-to-INTEGER migration data loss on existing records

**Governance docs to consult:** Blueprint Part 3.2, Part 10.x, migrations/001

**Important reminders:**
- ALWAYS bind `tenantId` from `c.get('tenantId')` — NEVER from request body
- Use `crypto.randomUUID()` for IDs
- Include `updated_at = datetime('now')` in every UPDATE

---

### TASK E02 — Add Zod Input Validation to All Endpoints

**Title:** Add Zod schema validation with @hono/zod-validator to all API endpoints

**Objective:** Replace all manual `if (!body.x)` validation checks with Zod schemas. Install `zod` and `@hono/zod-validator`. Define schemas for all POST/PATCH request bodies. Add automated 422 responses on invalid input.

**Why it matters:** The current manual validation is incomplete. POST /orders checks 3 fields but doesn't validate types, ranges, or formats. BOM and quality_check POST handlers have zero validation. This is a security and reliability vulnerability.

**Repo scope:** `webwaka-production` only

**Dependencies:** None (can run in parallel with E01)

**Prerequisites:** npm packages `zod` and `@hono/zod-validator` installed

**Impacted modules:** `src/modules/production-mgmt/index.ts`

**Likely files to change:**
- `package.json` — add `zod` and `@hono/zod-validator`
- `src/modules/production-mgmt/index.ts` — replace manual validation with zValidator

**Schemas to implement:**
```typescript
// Production Order
const createOrderSchema = z.object({
  productName: z.string().min(1).max(255),
  quantity: z.number().positive().int(),
  unit: z.string().min(1).max(50),
  scheduledStartDate: z.string().datetime().optional(),
  scheduledEndDate: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

// BOM Item
const createBOMItemSchema = z.object({
  componentName: z.string().min(1).max(255),
  componentSku: z.string().max(100).optional(),
  quantityRequired: z.number().positive(),
  unit: z.string().min(1).max(50),
  unitCostKobo: z.number().nonnegative().int().optional(),
});

// Quality Check
const createQualityCheckSchema = z.object({
  checkType: z.enum(['IN_PROCESS', 'FINAL', 'INCOMING']),
  result: z.enum(['PASS', 'FAIL', 'PENDING']),
  notes: z.string().max(2000).optional(),
  checkedAt: z.string().datetime().optional(),
});

// Order Status Patch
const patchOrderSchema = z.object({
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  actualStartDate: z.string().datetime().optional(),
  actualEndDate: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field required' });
```

**Expected output:**
- All routes return 422 with field-level error messages on invalid input
- TypeScript types inferred from schemas
- No manual `if (!body.x)` checks remaining

**Acceptance criteria:**
- [ ] POST /orders with `quantity: -1` returns 422 with message about quantity
- [ ] POST /orders with missing `productName` returns 422
- [ ] POST /orders with valid body returns 201
- [ ] POST /bom with invalid checkType returns 422
- [ ] All field errors are machine-readable (array of { field, message })

**Tests required:**
- Unit: test each schema with invalid inputs via `schema.safeParse()`
- Integration: send malformed JSON to each endpoint and verify 422

**Risks:**
- `@hono/zod-validator` version must match Hono v4 — check compatibility

---

### TASK E03 — Add GET /orders/:id Single Order Endpoint

**Title:** Add `GET /orders/:id` endpoint to retrieve a single production order with its BOM and quality checks

**Objective:** Implement a new endpoint that returns a production order by ID, including its linked BOM items and quality checks, as a nested response. This endpoint is essential for detail views in the React UI.

**Why it matters:** The current API has no way to retrieve a single order. Any UI that needs to show an order detail page (the majority of manufacturing UX) cannot work without this.

**Repo scope:** `webwaka-production` only

**Dependencies:** E01 (D1 queries must be live)

**Impacted modules:** `src/modules/production-mgmt/index.ts`, `src/core/types.ts`

**Likely files to change:**
- `src/modules/production-mgmt/index.ts` — add new GET /:id route
- `src/core/types.ts` — add `ProductionOrderDetail` type with nested BOM + quality

**Expected output:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "orderNumber": "PO-...",
    "productName": "Cement Bag 50kg",
    "quantity": 500,
    "unit": "bags",
    "status": "IN_PROGRESS",
    "bom": [...],
    "qualityChecks": [...]
  }
}
```

**Acceptance criteria:**
- [ ] Returns 200 with full nested order for valid ID + correct tenant
- [ ] Returns 404 if order does not exist
- [ ] Returns 404 if order belongs to different tenant (tenant isolation)
- [ ] BOM items and quality checks are included as nested arrays
- [ ] Response time < 100ms (2 D1 queries batched)

**Tests required:**
- Unit: mock D1, verify response structure
- Integration: create order, add BOM items, retrieve with GET /:id
- Security: attempt retrieval with wrong tenantId JWT → 404 (not 403)

---

### TASK E04 — Add Audit Log Table and Event Emission

**Title:** Add audit_log D1 table and emit an audit record on every state-changing operation

**Objective:** Add migration `003_audit_log.sql` creating an `audit_log` table. On every POST, PATCH, DELETE operation in production-mgmt, insert an audit record. Optionally publish events via `@webwaka/core/events`.

**Why it matters:** Manufacturing compliance (ISO 9001, NAFDAC) requires a complete audit trail. Without this, there is no way to answer "who changed this order and when?" This is also a foundation for the planned event-driven architecture.

**Repo scope:** `webwaka-production` only

**Dependencies:** E01 (D1 queries), E07 (structured logging)

**Impacted modules:**
- New migration `migrations/003_audit_log.sql`
- `src/modules/production-mgmt/index.ts`
- `src/core/types.ts`

**Audit log schema:**
```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id           TEXT PRIMARY KEY NOT NULL,
  tenant_id    TEXT NOT NULL,
  entity_type  TEXT NOT NULL,  -- 'production_order', 'bom_item', 'quality_check'
  entity_id    TEXT NOT NULL,
  action       TEXT NOT NULL,  -- 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE'
  actor_id     TEXT NOT NULL,  -- JWT sub claim
  actor_role   TEXT NOT NULL,
  old_value    TEXT,           -- JSON snapshot before change
  new_value    TEXT,           -- JSON snapshot after change
  ip_address   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_entity
  ON audit_log (tenant_id, entity_type, entity_id, created_at DESC);
```

**Acceptance criteria:**
- [ ] Every POST creates an audit_log entry with action='CREATE'
- [ ] Every PATCH creates an audit_log entry with action='UPDATE', old_value, new_value
- [ ] Every DELETE creates an audit_log entry with action='DELETE', old_value
- [ ] Audit log records tenant_id from JWT (never from request)
- [ ] New endpoint `GET /audit?entityType=production_order&entityId=:id` returns audit trail
- [ ] Audit log is never deleteable via API (no DELETE endpoint)

**Tests required:**
- Integration: create order → verify audit_log entry
- Integration: patch order → verify audit_log shows old and new status
- Security: audit tenant isolation — tenant A cannot read tenant B's audit log

---

### TASK E05 — Implement Paystack Client (initializePayment + verifyPayment)

**Title:** Implement the Paystack integration stub: initializePayment and verifyPayment

**Objective:** Replace the stubbed `PaystackClient` in `src/core/paystack.ts` with real `fetch()` calls to the Paystack API. Add a webhook endpoint to receive and verify Paystack events. This enables procurement payment flows.

**Why it matters:** Paystack is named in Invariant 5 (Nigeria First). The materials procurement epic (PROD-4) depends entirely on this integration. The stub currently throws errors — any call would crash.

**Repo scope:** `webwaka-production` only

**Prerequisites:**
- `PAYSTACK_SECRET_KEY` configured as Cloudflare Workers Secret (`wrangler secret put PAYSTACK_SECRET_KEY`)
- wrangler.toml already has `PAYSTACK_SECRET_KEY` binding

**Impacted modules:**
- `src/core/paystack.ts` — implement both methods
- `src/worker.ts` — add `/webhooks/paystack` route (public, no JWT auth)

**Paystack endpoints to implement:**
- `POST https://api.paystack.co/transaction/initialize`
- `GET https://api.paystack.co/transaction/verify/:reference`
- Webhook: `POST /webhooks/paystack` — verify HMAC-SHA512 signature

**Acceptance criteria:**
- [ ] `initializePayment()` returns valid authorization_url from Paystack
- [ ] `verifyPayment()` returns correct transaction status
- [ ] Webhook endpoint verifies Paystack HMAC signature before processing
- [ ] Failed signature verification returns 401 (not 200)
- [ ] All amounts are in kobo (integer) — no float arithmetic
- [ ] Payment reference format: `PROD-{tenantId[:8]}-{timestamp}-{random}`

**Tests required:**
- Unit: mock `fetch()`, verify correct headers and request body sent to Paystack
- Unit: verify HMAC-SHA512 signature validation logic
- Integration: use Paystack test keys to run a real transaction initialization

---

### TASK E06 — Replace Local AI Stub with @webwaka/core/ai

**Title:** Delete src/core/ai.ts stub and replace with @webwaka/core/ai (Invariant 1 compliance)

**Objective:** The local `src/core/ai.ts` file duplicates (as a stub) the AI functionality provided by `@webwaka/core/ai`. This violates Invariant 1 (Build Once Use Infinitely). Delete the local file and import the canonical AIEngine from the core package.

**Why it matters:** Invariant 1 is non-negotiable. Maintaining a local stub alongside a platform-provided implementation creates drift, inconsistency, and extra maintenance burden. The @webwaka/core/ai module is already installed and available.

**Repo scope:** `webwaka-production` only

**Impacted modules:**
- `src/core/ai.ts` — DELETE this file
- `src/modules/production-mgmt/index.ts` — import from @webwaka/core/ai

**Replacement import:**
```typescript
import { AIEngine } from '@webwaka/core/ai';
// AIEngine provides: chat(), analyze(), stream() methods
```

**Acceptance criteria:**
- [ ] `src/core/ai.ts` is deleted
- [ ] All imports of the local AI module updated to `@webwaka/core/ai`
- [ ] `schedule_optimization` endpoint works using AIEngine
- [ ] TypeScript compiles cleanly after change

---

### TASK E07 — Add Structured Logging via @webwaka/core/logger

**Title:** Replace console.error/console.warn with @webwaka/core/logger structured logging

**Objective:** Import the canonical logger from `@webwaka/core/logger` and use it throughout the worker and production-mgmt module. Remove all direct `console.*` calls from production code.

**Why it matters:** Structured logging enables log aggregation, alerting, and debugging in Cloudflare's log infrastructure. `console.error` produces unstructured strings that are impossible to query or alert on. The CI pipeline already rejects `console.log` — `console.error` should be treated the same.

**Repo scope:** `webwaka-production` only

**Impacted modules:**
- `src/worker.ts` — replace `console.error` in error handler
- `src/modules/production-mgmt/index.ts` — add request logging

**Logger usage pattern:**
```typescript
import { createLogger } from '@webwaka/core/logger';
const logger = createLogger({ vertical: 'production', version: '1.0.0' });
logger.error({ err, tenantId, path: c.req.path }, 'Unhandled error');
logger.info({ tenantId, orderId, action: 'CREATE' }, 'Production order created');
```

**Acceptance criteria:**
- [ ] Zero `console.*` calls in production code (excludes *.test.ts)
- [ ] Error handler in worker.ts uses logger.error with structured fields
- [ ] Each state-changing operation logs at INFO level
- [ ] Logger does not log JWT tokens or secrets

---

### TASK E08 — Add Offline Sync API Endpoint

**Title:** Implement POST /api/production/mgmt/sync to accept offline mutation queue batches

**Objective:** Create a sync endpoint that accepts an array of queued mutations from the Dexie client. Process each mutation in order (CREATE/UPDATE/DELETE), apply D1 queries, and return success/failure per item. This closes the offline-first loop.

**Why it matters:** `src/db/db.ts` has a fully built mutation queue but no API endpoint to flush it. Without this endpoint, offline mode writes never reach the server. The offline invariant is broken.

**Repo scope:** `webwaka-production` only

**Dependencies:** E01 (D1 queries live), E02 (Zod validation)

**Endpoint:** `POST /api/production/mgmt/sync`

**Request schema:**
```typescript
const syncPayloadSchema = z.object({
  mutations: z.array(z.object({
    id: z.string(),           // Client-side mutation queue ID
    operation: z.enum(['CREATE', 'UPDATE', 'DELETE']),
    resource: z.enum(['production_order', 'bill_of_material', 'quality_check']),
    resourceId: z.string().uuid(),
    payload: z.string(),      // JSON string of the entity
    clientTimestamp: z.string().datetime(),
  })).max(100),              // Batch limit
});
```

**Response:**
```json
{
  "success": true,
  "results": [
    { "id": "mutation-1", "success": true, "serverTimestamp": "..." },
    { "id": "mutation-2", "success": false, "error": "conflict: record modified on server" }
  ]
}
```

**Acceptance criteria:**
- [ ] Accepts up to 100 mutations per batch
- [ ] Processes each mutation and applies D1 operation
- [ ] Returns per-item success/failure (partial success allowed)
- [ ] Idempotent — processing the same mutation twice returns success (deduplicated by resourceId + operation)
- [ ] Tenant isolation enforced (mutations for another tenant are rejected)
- [ ] Rate limited (max 10 sync calls per minute per tenant)

---

### TASK E09 — Implement PWA Service Worker and Manifest

**Title:** Add PWA service worker and web app manifest using vite-plugin-pwa

**Objective:** Install `vite-plugin-pwa` and configure it with a Workbox service worker strategy. Add a `manifest.json` with WebWaka Production branding. Register the service worker in `src/main.tsx`. Enable background sync for the Dexie mutation queue.

**Why it matters:** The repo's CHANGELOG claims "PWA First" as an enforced invariant, and the README states "service worker ready." In reality, no service worker or manifest exists. Nigerian users on mobile with intermittent connectivity need the full offline experience.

**Repo scope:** `webwaka-production` only

**Impacted modules:**
- `vite.config.ts` — add VitePWA plugin config
- `src/main.tsx` — register service worker
- New `public/icons/` — app icons at 192px and 512px

**VitePWA config:**
```typescript
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'icons/*.png'],
  manifest: {
    name: 'WebWaka Production Suite',
    short_name: 'WK Production',
    description: 'Manufacturing & Production Management — Nigeria & Africa',
    theme_color: '#0f172a',
    background_color: '#0f172a',
    display: 'standalone',
    start_url: '/',
    icons: [
      { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  },
  workbox: {
    runtimeCaching: [
      { urlPattern: /^\/api\//, handler: 'NetworkFirst', options: { cacheName: 'api-cache', networkTimeoutSeconds: 3 } },
    ],
  },
})
```

**Acceptance criteria:**
- [ ] Lighthouse PWA score ≥ 90
- [ ] App installable on Android Chrome
- [ ] App works offline after first load (cached shell + Dexie data)
- [ ] API calls fall back to Dexie cache when offline
- [ ] Service worker updates automatically on new deployment

---

### TASK E10 — Add Cost Fields to BOM and Cost Rollup

**Title:** Add unit_cost_kobo to BOM items and computed total_cost_kobo to production orders

**Objective:** Add `unit_cost_kobo INTEGER` to the `bill_of_materials` table (migration 004). Add a `total_cost_kobo` computed field to the production order GET response (sum of BOM item costs). Update BOM POST to accept optional cost.

**Why it matters:** Nigerian manufacturers need cost tracking per order. Without cost rollup, the system cannot produce job costing reports or profitability analysis. All values must be in kobo (integer) per Invariant 5.

**Repo scope:** `webwaka-production` only

**Dependencies:** E01, E03

**New migration (`004_bom_cost.sql`):**
```sql
ALTER TABLE bill_of_materials ADD COLUMN unit_cost_kobo INTEGER DEFAULT 0;
ALTER TABLE bill_of_materials ADD COLUMN total_cost_kobo INTEGER GENERATED ALWAYS AS (quantity_required * unit_cost_kobo) VIRTUAL;
```

**Acceptance criteria:**
- [ ] BOM items accept `unitCostKobo` on POST
- [ ] GET /orders/:id returns `totalCostKobo` (sum of all BOM item costs)
- [ ] All costs stored as INTEGER kobo — no floats
- [ ] Cost displays as ₦ formatted using `formatKobo()` from i18n module
- [ ] Cost rollup updates when BOM items are added or removed

---

### TASK E11 — Add Defect Classification to Quality Checks

**Title:** Add defect_type, severity, and NCR disposition workflow to quality_checks

**Objective:** Extend the `quality_checks` table with `defect_type`, `severity`, and `disposition` fields. Add an NCR (Non-Conformance Report) workflow: when a check fails, require a disposition decision (rework/scrap/use-as-is). This brings the QC module to ISO 9001 compliance.

**Repo scope:** `webwaka-production` only

**Dependencies:** E01, E04 (audit log needed for NCR workflow)

**New migration (`005_qc_defect_classification.sql`):**
```sql
ALTER TABLE quality_checks ADD COLUMN defect_type TEXT;
ALTER TABLE quality_checks ADD COLUMN severity TEXT CHECK (severity IN ('CRITICAL', 'MAJOR', 'MINOR', 'OBSERVATION'));
ALTER TABLE quality_checks ADD COLUMN disposition TEXT CHECK (disposition IN ('REWORK', 'SCRAP', 'USE_AS_IS', 'RETURN_TO_SUPPLIER', 'PENDING_REVIEW'));
ALTER TABLE quality_checks ADD COLUMN ncr_number TEXT;
```

**Acceptance criteria:**
- [ ] FAIL quality checks can include defect_type and severity
- [ ] CRITICAL failures trigger a notification (via @webwaka/core/notifications if available)
- [ ] Disposition required before a FAIL check can be considered resolved
- [ ] NCR number auto-generated: `NCR-{tenantId[:6]}-{year}-{sequence}`
- [ ] API returns 409 if attempting to complete an order with unresolved CRITICAL failures

---

### TASK E12 — Add Production KPIs Endpoint

**Title:** Add `GET /api/production/mgmt/analytics/kpis` endpoint returning key production metrics

**Objective:** Add an analytics endpoint that returns production KPIs: total orders by status, quality pass rate, average cycle time (scheduled vs. actual), orders due today/this week, and BOM cost totals by product.

**Why it matters:** Manufacturing dashboards live and die by their KPIs. Currently the React UI shows a static module listing. Without metrics, there's nothing to act on.

**Repo scope:** `webwaka-production` only

**Dependencies:** E01, E10, E11

**Endpoint:** `GET /api/production/mgmt/analytics/kpis?period=30d`

**Acceptance criteria:**
- [ ] Returns order counts by status (DRAFT/IN_PROGRESS/COMPLETED/CANCELLED)
- [ ] Returns QC pass rate (% of PASS checks vs. total FINAL checks) for the period
- [ ] Returns average cycle time in days (actual_end - actual_start for COMPLETED orders)
- [ ] Returns total BOM cost by product name
- [ ] Cached in KV for 5 minutes to reduce D1 load
- [ ] Tenant isolated — only returns data for authenticated tenant

---

### TASK E13 — Add Event Publishing via @webwaka/core/events

**Title:** Publish domain events on all production order state changes via @webwaka/core/events

**Objective:** After every successful CREATE, PATCH (especially status changes), and DELETE operation, publish a domain event using `@webwaka/core/events`. This enables cross-repo workflows (e.g., inventory reservation on order creation).

**Why it matters:** The platform is event-driven. Without events, the production vertical is an island — inventory can't react to orders, notifications can't fire, analytics can't stream. Events are the integration fabric.

**Events to publish:**
```typescript
'webwaka.production.order.created'
'webwaka.production.order.status_changed'
'webwaka.production.order.deleted'
'webwaka.production.quality_check.failed'
'webwaka.production.bom_item.added'
```

**Acceptance criteria:**
- [ ] Each state-changing endpoint publishes the correct event
- [ ] Events include: tenantId, entityId, actorId, timestamp, and relevant payload
- [ ] Event publishing failure does not fail the primary HTTP response (fire-and-forget with logged error)
- [ ] Events use correct event type strings (check @webwaka/core/events schema)

---

### TASK E14 — Add Energy Cost and Nigeria-Specific Fields

**Title:** Add energy_cost_kobo and generator_hours fields to production orders (Nigeria First)

**Objective:** Add `energy_cost_kobo INTEGER` and `generator_fuel_litres REAL` to the production_orders table. Energy represents ~40% of Nigerian manufacturing costs. These fields enable accurate job costing in the Nigerian context.

**New migration (`006_nigeria_fields.sql`):**
```sql
ALTER TABLE production_orders ADD COLUMN energy_cost_kobo INTEGER DEFAULT 0;
ALTER TABLE production_orders ADD COLUMN generator_fuel_litres REAL DEFAULT 0;
ALTER TABLE production_orders ADD COLUMN compliance_reference TEXT; -- NAFDAC/SON reference number
```

**Acceptance criteria:**
- [ ] Production orders accept energy_cost_kobo on POST and PATCH
- [ ] Total order cost includes energy_cost_kobo in rollup
- [ ] compliance_reference field available for NAFDAC/SON documentation
- [ ] All cost fields display in NGN using formatKobo()

---

### TASK E15 — Raise Test Coverage and Add Integration Tests

**Title:** Raise Vitest line coverage threshold to 80% and add Cloudflare Workers integration tests

**Objective:** Raise the line coverage threshold in `vitest.config.ts` from 30% to 80%. Add integration tests using Miniflare or Wrangler's test environment that test real D1 query execution. Ensure all happy paths and error paths are covered.

**Why it matters:** The 30% threshold is inconsistent with the CHANGELOG's stated >90% goal. Low thresholds mean broken code can ship. Manufacturing systems require high reliability — inadequate tests are a liability.

**Impacted modules:** `vitest.config.ts`, `src/modules/production-mgmt/index.test.ts`

**Tests to add:**
- D1 query tests (with Miniflare D1 bindings)
- Cross-tenant isolation tests
- Zod schema validation tests
- Paystack webhook signature verification tests
- Sync endpoint idempotency tests
- Audit log creation tests

**Acceptance criteria:**
- [ ] `vitest.config.ts` line threshold ≥ 80%
- [ ] All 8 D1 endpoints have integration tests with real D1 queries
- [ ] CI pipeline fails if coverage drops below threshold
- [ ] Cross-tenant isolation explicitly tested for all GET/PATCH/DELETE endpoints

---

### TASK E16 — Add ESLint Configuration

**Title:** Configure ESLint with TypeScript-aware rules for the repo

**Objective:** Add ESLint with `@typescript-eslint/eslint-plugin`, `eslint-plugin-import`, and relevant rules. Add a `lint` script to `package.json`. Add an ESLint step to the CI pipeline.

**Impacted modules:**
- New `eslint.config.js` (flat config)
- `package.json` — add lint script
- `.github/workflows/deploy.yml` — add lint step

**Key rules:**
- `@typescript-eslint/no-explicit-any` — error
- `@typescript-eslint/no-floating-promises` — error
- `no-console` — error (enforces structured logging invariant)
- `import/no-duplicates` — warn
- `eqeqeq` — error

**Acceptance criteria:**
- [ ] `npm run lint` passes cleanly on the existing codebase
- [ ] CI pipeline fails on lint errors
- [ ] `no-console` rule replaces the fragile `grep` check in CI

---

### TASK E17 — Add PDF/Excel Export Endpoint

**Title:** Add `GET /api/production/mgmt/orders/:id/export?format=pdf|xlsx` export endpoint

**Objective:** Add an endpoint that generates a downloadable production order report in PDF or XLSX format, including BOM, quality checks, cost summary, and order details.

**Why it matters:** Nigerian manufacturers need paper/digital records for procurement, compliance, and banking purposes. Exporting a production order as PDF is a must-have for daily operations.

**Dependencies:** E01, E03, E10, E11

**Acceptance criteria:**
- [ ] PDF format returns a valid PDF with order details, BOM table, QC results
- [ ] XLSX format returns a valid Excel file with separate sheets for BOM and QC
- [ ] Filenames: `PO-{orderNumber}-{date}.pdf/xlsx`
- [ ] Headers: `Content-Disposition: attachment; filename="..."`
- [ ] Requires VIEWER+ role (same as GET)

---

### TASK E18 — Add BOM Versioning

**Title:** Add BOM version control — production orders link to a specific BOM revision

**Objective:** Add BOM revision tracking so that changes to a BOM don't affect orders that were already started. Add `bom_version INTEGER` to production_orders and a `bom_versions` table that snapshots BOM at order start.

**Why it matters:** Engineering BOMs change over time. If a BOM changes mid-production, operators need to know what BOM version was active when their order started. This is a basic traceability requirement.

**Migration:** `007_bom_versioning.sql`

**Acceptance criteria:**
- [ ] BOM items track a version number
- [ ] When production order moves to IN_PROGRESS, current BOM is snapshotted
- [ ] Historical BOM versions are retrievable
- [ ] Active BOM version shown on GET /orders/:id

---

### TASK E19 — Add Status Machine Validation (PATCH /orders/:id/status)

**Title:** Add PATCH /orders/:id/status endpoint with validated state machine transitions

**Objective:** Separate status transitions into their own endpoint with explicit validation of allowed state changes. Prevent invalid transitions (e.g., CANCELLED → IN_PROGRESS).

**State machine:**
```
DRAFT → IN_PROGRESS (requires: at least 1 BOM item)
IN_PROGRESS → COMPLETED (requires: all FINAL quality checks passed)
IN_PROGRESS → CANCELLED (requires: TENANT_ADMIN or higher)
COMPLETED → (no transitions)
CANCELLED → (no transitions)
```

**Acceptance criteria:**
- [ ] PATCH /orders/:id/status returns 422 for invalid transitions
- [ ] Transition to IN_PROGRESS requires at least 1 BOM item
- [ ] Transition to COMPLETED blocked if any unresolved CRITICAL quality failures
- [ ] All transitions emit an audit log entry and a domain event

---

### TASK E20 — Add Playwright E2E Tests

**Title:** Implement Playwright E2E tests for the React production management UI

**Objective:** Write Playwright tests that cover the main user flows: viewing the dashboard, creating a production order, adding BOM items, recording a quality check, and viewing order details.

**Why it matters:** The CI pipeline has a placeholder for E2E tests (Layer 4 of the 5-layer QA protocol) but no actual tests. E2E tests catch regressions that unit tests miss.

**Impacted modules:**
- New `tests/e2e/` directory
- `playwright.config.ts`
- `.github/workflows/deploy.yml` — activate E2E step

**Test flows:**
1. Dashboard loads and shows module cards
2. Create production order form submits and shows success
3. Order list shows newly created order
4. BOM item can be added to an order
5. Quality check can be recorded on an order

---

### TASK B01 — Fix Quantity Stored as REAL

**Title:** Migrate quantity fields from REAL to INTEGER (milli-units × 1000)

**Objective:** Change `quantity`, `quantity_required`, and `quantity_used` from SQLite REAL to INTEGER, storing values as milli-units (1 kg = 1000, 1.5 kg = 1500). This prevents float precision errors in financial and manufacturing calculations.

**Migration:** `002_fix_quantity_type.sql` (apply BEFORE E01)

```sql
-- SQLite does not support ALTER COLUMN — must use table rebuild
CREATE TABLE production_orders_new (...quantity INTEGER NOT NULL...);
INSERT INTO production_orders_new SELECT ..., CAST(quantity * 1000 AS INTEGER), ... FROM production_orders;
DROP TABLE production_orders;
ALTER TABLE production_orders_new RENAME TO production_orders;
-- Repeat for bill_of_materials
```

**Acceptance criteria:**
- [ ] All quantity fields stored as INTEGER (milli-units)
- [ ] API accepts and returns human-readable decimals (e.g., 1.5) and converts internally
- [ ] Tests verify 1.5 kg stored as 1500, retrieved as 1.5
- [ ] No existing data lost during migration

---

### TASK B02 — Fix order_number Collision Risk

**Title:** Fix `order_number` generation to prevent concurrent collision

**Objective:** Replace `PO-${Date.now()}` with a collision-safe format using tenant prefix, timestamp, and UUID suffix: `PO-${tenantId.slice(0,6).toUpperCase()}-${Date.now()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`.

**Acceptance criteria:**
- [ ] No two concurrent order creations can produce the same order number
- [ ] Order number format is human-readable and sortable by creation time
- [ ] Order number length ≤ 40 characters

---

### TASK B03 — Fix Coverage Threshold

**Title:** Fix Vitest line coverage threshold from 30% to match stated 80%+ target

**Objective:** Update `vitest.config.ts` to set `lines: 80` (not 30). This is a simple one-line fix but must be done before E15.

**Acceptance criteria:**
- [ ] `vitest.config.ts` has `lines: 80` or higher
- [ ] CI fails when line coverage drops below threshold
- [ ] CHANGELOG updated to remove misleading ">90%" target (set realistic 80% for now)

---

### TASK B04 — Add WAREHOUSE_STAFF Role Access

**Title:** Define what routes WAREHOUSE_STAFF can access

**Objective:** `WAREHOUSE_STAFF` is defined in `PRODUCTION_ROLES` but not included in any `requireRole()` call. Define the access policy: WAREHOUSE_STAFF should have read access to orders and BOM, write access to BOM quantity_used (consumption recording), but no quality check or order management access.

**Acceptance criteria:**
- [ ] WAREHOUSE_STAFF can GET /orders and GET /orders/:id
- [ ] WAREHOUSE_STAFF can GET and update quantity_used on BOM items
- [ ] WAREHOUSE_STAFF cannot create/delete orders or record quality checks
- [ ] Tests verify WAREHOUSE_STAFF permissions

---

### TASK B05 — Fix console.error in Worker Error Handler

**Title:** Replace console.error in worker.ts with @webwaka/core/logger

**Objective:** One line fix — import createLogger and replace `console.error(...)` with `logger.error(...)` in the Hono error handler.

---

### TASK B06 — Remove Local AI Stub (Invariant 1)

**Title:** Delete src/core/ai.ts and migrate all usages to @webwaka/core/ai

**Already captured in E06** — listed here for explicitness as a bug fix.

---

### TASK B07 — Add updated_at Manual Setting to All UPDATE Queries

**Title:** Ensure updated_at = datetime('now') is included in every D1 UPDATE statement

**Already addressed within E01** — listed here for explicitness.

---

### TASK B08 — Return 404 on PATCH/DELETE of Non-Existent Records

**Title:** Return HTTP 404 when PATCH or DELETE targets a record that doesn't exist

**Objective:** Current stubs return 200 success regardless. Implement: before UPDATE/DELETE, run `SELECT id FROM production_orders WHERE id = ? AND tenant_id = ?`; if no result, return 404.

**Already addressed within E01** — listed here for explicitness.

---

## 6. QA PLANS

---

### QA-E01 — D1 Database Queries

**What must be verified:**
- Every endpoint persists data to D1 and retrieves it correctly
- All 8 endpoints return the correct response structure
- Pagination is accurate (correct total, correct page slicing)

**Bugs to look for:**
- Queries using string interpolation instead of `.bind()` (SQL injection)
- Missing `WHERE tenant_id = ?` on any query
- `updated_at` not updated on PATCH operations
- Foreign key violations on BOM/QC inserts when orderId doesn't exist
- Race conditions in order_number generation

**Edge cases to test:**
- Empty tenant (no orders yet) → GET returns empty array with total: 0
- pageSize=0 → return 400 or default to 20
- pageSize=999 → capped at 100 (MAX_PAGE_SIZE)
- DELETE non-existent order → 404
- PATCH with no valid fields → 400
- BOM insert with non-existent orderId → 404 or 409
- Concurrent POSTs with same productName → both succeed with different IDs

**Regressions to detect:**
- Existing unit tests still pass after D1 implementation
- Response structure matches the existing TypeScript interfaces

**Cross-tenant assumption:** Tenant A's orders never appear in Tenant B's responses.

**Deployment checks:**
- Run `wrangler d1 migrations apply` before testing
- Verify migration 001 applied successfully with `wrangler d1 execute` listing tables

**Done when:** All 8 endpoints return real data, all acceptance criteria pass, cross-tenant tests pass.

---

### QA-E02 — Zod Validation

**What must be verified:**
- Every endpoint rejects invalid input with 422
- Error messages include field names
- Valid inputs are accepted and processed correctly

**Bugs to look for:**
- Schema too strict rejecting valid inputs (e.g., optional fields required)
- Schema too loose accepting invalid inputs (e.g., negative quantity)
- Type coercion issues (string "100" accepted when number expected)

**Edge cases to test:**
- Empty string `""` for required string fields → 422
- Zero quantity → 422
- Negative quantity → 422
- Future scheduledEndDate before scheduledStartDate → 422 (add refine)
- Very long strings (>255 chars) → 422
- Missing Content-Type header → 400 or 422

**Done when:** All 422 edge cases pass, TypeScript types correctly inferred from schemas.

---

### QA-E03 — Single Order Endpoint

**What must be verified:**
- GET /orders/:id returns complete order with nested BOM and QC
- 404 for non-existent orders
- 404 (not 403) for cross-tenant access

**Edge cases to test:**
- Order with no BOM items → bom: []
- Order with no quality checks → qualityChecks: []
- Large BOM (100+ items) → all returned (or paginated)
- Response includes all fields from ProductionOrder interface

---

### QA-E04 — Audit Log

**What must be verified:**
- Audit record created for every POST, PATCH, DELETE
- old_value correctly captures state before PATCH/DELETE
- new_value correctly captures state after PATCH
- No audit records created by GET operations

**Bugs to look for:**
- audit_log insert failing silently (not atomic with main operation)
- old_value/new_value JSON serialization issues
- tenant_id in audit_log not matching JWT tenantId

**Edge cases:**
- Failed operation (e.g., order not found) → no audit record created
- Batch sync → each mutation creates its own audit record

---

### QA-E05 — Paystack Integration

**What must be verified:**
- `initializePayment()` sends correct headers to Paystack API
- `verifyPayment()` correctly parses Paystack response
- Webhook HMAC validation rejects tampered payloads

**Bugs to look for:**
- Incorrect `Authorization: Bearer` header format
- Amount sent as naira instead of kobo
- HMAC computed with wrong algorithm (must be SHA-512, not SHA-256)
- Webhook handler returning 200 before processing (Paystack requires fast 200)

**Edge cases:**
- Paystack API timeout → return 503 to caller
- Duplicate webhook delivery (Paystack may retry) → idempotent handling required
- Invalid reference on verify → return 404

---

### QA-E06 — AI Client Migration

**What must be verified:**
- `src/core/ai.ts` no longer exists
- `@webwaka/core/ai` AIEngine imported correctly
- TypeScript compiles cleanly
- No runtime errors when AI features are called

**Regressions to check:**
- All imports of the old local AI path updated
- No "module not found" errors at runtime

---

### QA-E07 — Structured Logging

**What must be verified:**
- Zero `console.*` calls in production code (`grep -r "console\." src/ --include="*.ts" --exclude="*.test.ts"`)
- Logger outputs valid JSON
- Sensitive data (JWT, secrets) not logged

**Edge cases:**
- Logger called with undefined fields → no crash
- Very long error messages → truncated to max length

---

### QA-E08 — Offline Sync Endpoint

**What must be verified:**
- Sync endpoint accepts valid mutation batches
- Each mutation processed and result returned
- Idempotent: same mutation twice → success both times
- Batch limit (100) enforced

**Bugs to look for:**
- Mutations processed out of order (CREATE before related entity exists)
- Missing tenant isolation check on sync payload
- Sync endpoint not rate limited

**Edge cases:**
- Empty mutations array → 200 with empty results
- 101 mutations → 422 (exceeds limit)
- CREATE mutation for already-existing resourceId → success (idempotent)
- DELETE mutation for non-existent resourceId → success (idempotent)

---

### QA-E09 — PWA Service Worker

**What must be verified:**
- Lighthouse PWA audit score ≥ 90
- App installable on Android Chrome
- Offline mode: app loads without internet
- API calls return cached data when offline
- Service worker updates on new deployment

**Edge cases:**
- Very slow network → service worker falls back to cache after 3s timeout
- Multiple browser tabs → service worker claims all clients
- New deploy → service worker updates without user refresh (autoUpdate)

---

### QA-E10 — BOM Cost Fields

**What must be verified:**
- unitCostKobo stored as INTEGER, not float
- totalCostKobo computed correctly (sum of quantity × unit_cost)
- GET /orders/:id includes totalCostKobo in response
- formatKobo() displays correct ₦ amount

**Edge cases:**
- BOM item with no cost → 0 kobo (not null)
- 1000 BOM items → cost rollup correct
- Integer overflow on very large quantities × high costs (check SQLite INTEGER max)

---

### QA-E11 — Defect Classification

**What must be verified:**
- FAIL quality checks can include defect_type, severity
- CRITICAL severity triggers notification
- Disposition required for FAIL checks before order COMPLETED
- NCR number auto-generated correctly

**Edge cases:**
- PASS check with severity field → 422 (severity only valid for FAIL)
- Order completion attempted with unresolved CRITICAL → 409

---

### QA-E12 — KPIs Endpoint

**What must be verified:**
- KPIs are calculated correctly (not hardcoded)
- Tenant isolation on all aggregation queries
- KV caching works (second request within 5 min returns cached result)
- Period parameter correctly filters data (30d, 7d, 90d)

---

### QA-E13 — Event Publishing

**What must be verified:**
- Events published after every state change
- Event publishing failure does not fail HTTP response
- Event payload includes all required fields (tenantId, entityId, timestamp)
- No duplicate events per operation

---

### QA-B01 — Quantity INTEGER Migration

**What must be verified:**
- Migration runs cleanly on empty and populated databases
- Existing data converted correctly (1.5 → 1500)
- API returns human-readable decimals (1500 → 1.5 in response)
- No data loss during migration

---

### QA-B02 — Order Number Collision

**What must be verified:**
- 100 concurrent order creations produce 100 unique order numbers
- Order number format is URL-safe (no special chars)
- Order number ≤ 40 characters

---

## 7. IMPLEMENTATION PROMPTS

---

### PROMPT-E01: Implement D1 Database Queries

```
You are an expert Cloudflare Workers engineer implementing the Cloudflare D1 database layer for the WebWaka Production Suite repository.

REPO: webwaka-production
OBJECTIVE: Replace ALL commented-out TODO stubs in src/modules/production-mgmt/index.ts with live Cloudflare D1 queries using prepared statements with .bind() parameters.

REPOSITORY CONTEXT:
- This is one module within a multi-repo WebWaka OS v4 platform. It is NOT standalone.
- Auth is handled by @webwaka/core (imported in src/middleware/auth.ts). Do NOT re-implement auth.
- tenantId is ALWAYS taken from c.get('tenantId') — sourced from the JWT payload. NEVER from request body, query params, or headers.
- D1 binding is available as c.env.DB (type D1Database from Cloudflare Workers types)
- The schema is in migrations/001_production_schema.sql
- Fix B01 and B02 as part of this task (quantity as INTEGER milli-units, collision-safe order_number)

ECOSYSTEM CAVEAT:
- Do NOT modify @webwaka/core, auth middleware, or worker.ts global routes.
- Do NOT implement features for other repos (inventory, super-admin).
- Stay strictly within src/modules/production-mgmt/index.ts and migrations/.

DEPENDENCIES:
- Run migration 001 first: npx wrangler d1 migrations apply webwaka-production-db-dev
- Fix B01 (quantity type) in migration 002 before writing queries

IMPACTED FILES:
- src/modules/production-mgmt/index.ts (primary)
- migrations/002_fix_quantity_type.sql (new)
- src/core/types.ts (if type updates needed)

REQUIRED DELIVERABLES:
1. All 8 D1 endpoints (GET orders, POST orders, PATCH orders/:id, DELETE orders/:id, GET bom, POST bom, GET quality, POST quality) implemented with real D1 queries
2. GET /orders/:id new endpoint (single order with nested BOM + QC)
3. Accurate pagination (page, pageSize, total, totalPages)
4. updated_at = datetime('now') on every UPDATE
5. 404 response when PATCH/DELETE targets non-existent record
6. Migration 002 for REAL-to-INTEGER quantity type conversion

ACCEPTANCE CRITERIA:
- POST /orders creates a record retrievable by GET /orders
- PATCH /orders/:id returns 404 for non-existent orders
- DELETE /orders/:id removes the record
- Tenant A cannot see Tenant B's orders (cross-tenant isolation enforced at SQL level)
- All queries use prepared statements with .bind() — NEVER string interpolation
- order_number format: PO-{tenantSlice}-{timestamp}-{uuidSlice}

GOVERNANCE DOCS: Read migrations/001_production_schema.sql, src/core/types.ts, wrangler.toml before starting.

IMPORTANT REMINDERS:
- Build Once Use Infinitely: don't duplicate @webwaka/core logic
- Offline First: ensure sync endpoint will work with same D1 tables
- Nigeria First: all monetary values in kobo (INTEGER)
- Thoroughness Over Speed: implement all 8 endpoints, not just the first few
- Zero Skipping Policy: do not skip error handling, do not skip cross-tenant testing
- Avoid drift and shortcuts: no console.log, no placeholder responses, no fake data
```

---

### PROMPT-E02: Add Zod Validation

```
You are an expert Hono/Cloudflare Workers engineer implementing input validation for the WebWaka Production Suite.

REPO: webwaka-production
OBJECTIVE: Install zod and @hono/zod-validator. Replace all manual if (!body.x) validation in src/modules/production-mgmt/index.ts with Zod schemas using the zValidator middleware. Return 422 with field-level errors on invalid input.

REPOSITORY CONTEXT:
- Hono v4 is the web framework (see package.json)
- @hono/zod-validator is the canonical Hono validation middleware
- All endpoints are in src/modules/production-mgmt/index.ts
- This is a multi-repo platform — do not validate fields that belong to other WebWaka repos (e.g., tenantId validation is handled by JWT auth in @webwaka/core)

ECOSYSTEM CAVEAT:
- This repo is NOT standalone. Auth and tenantId come from @webwaka/core JWT middleware.
- Do not add any validation for tenantId — it is always sourced from JWT.

SCHEMAS TO IMPLEMENT:
- createOrderSchema: productName (string 1-255), quantity (positive int), unit (string 1-50), scheduledStartDate (datetime? optional), scheduledEndDate (datetime? optional), notes (string max 2000, optional)
  - Add .refine() to ensure scheduledEndDate > scheduledStartDate if both provided
- patchOrderSchema: all fields optional, but at least one required (use .refine())
- createBOMItemSchema: componentName (string 1-255), quantityRequired (positive number), unit (string 1-50), componentSku (string optional), unitCostKobo (nonnegative int, optional)
- createQualityCheckSchema: checkType (enum IN_PROCESS|FINAL|INCOMING), result (enum PASS|FAIL|PENDING), notes (string max 2000, optional), checkedAt (datetime optional)

REQUIRED DELIVERABLES:
1. zod and @hono/zod-validator added to package.json
2. All 6 POST/PATCH endpoints use zValidator('json', schema)
3. TypeScript types inferred from schemas (remove manual type annotations)
4. 422 responses include { success: false, errors: [{ field, message }] }

ACCEPTANCE CRITERIA:
- POST /orders with quantity: -1 returns 422
- POST /orders with missing productName returns 422
- POST /orders with valid body returns 201
- All Zod errors are machine-readable JSON

GOVERNANCE DOCS: Read src/core/types.ts for domain type definitions. Read Hono docs at https://hono.dev/docs/guides/validation.

IMPORTANT REMINDERS:
- Thoroughness: validate ALL endpoints, not just POST /orders
- Zero Skipping: test all edge cases (empty strings, negative numbers, invalid enums)
- No drift: do not remove RBAC guards while adding validation
```

---

### PROMPT-E03: Add Single Order Endpoint

```
You are an expert Cloudflare Workers API engineer implementing a missing endpoint for the WebWaka Production Suite.

REPO: webwaka-production
OBJECTIVE: Implement GET /api/production/mgmt/orders/:id endpoint that returns a single production order with its nested BOM items and quality checks.

REPOSITORY CONTEXT:
- The production-mgmt router is in src/modules/production-mgmt/index.ts
- D1 schema is in migrations/001_production_schema.sql
- Response must match the ApiResponse<T> type in src/core/types.ts
- This endpoint should use D1 batch() to fetch order + BOM + quality_checks in one roundtrip

REQUIRED DELIVERABLES:
1. GET /orders/:id route added to production-mgmt router
2. D1 batch query: SELECT order + SELECT bom items + SELECT quality checks
3. 404 response if order doesn't exist OR belongs to different tenant
4. TypeScript type ProductionOrderDetail added to src/core/types.ts

RESPONSE STRUCTURE:
{
  "success": true,
  "data": {
    ...order fields,
    "bom": [...BOM items],
    "qualityChecks": [...quality checks]
  }
}

ACCEPTANCE CRITERIA:
- Returns 200 with nested data for valid ID + correct tenant
- Returns 404 for non-existent order (same as wrong-tenant — don't leak existence)
- BOM and quality check arrays are empty arrays (not null) when no items exist
- Uses VIEWER role access (same as GET /orders list)

GOVERNANCE: Read migrations/001_production_schema.sql for correct column names.

IMPORTANT REMINDERS:
- tenantId ALWAYS from c.get('tenantId') — never from URL params
- 404 for wrong-tenant (not 403) — to prevent tenant enumeration
- Use .batch() for D1 efficiency
```

---

### PROMPT-E04: Add Audit Log

```
You are a compliance and backend engineer implementing audit logging for the WebWaka Production Suite.

REPO: webwaka-production
OBJECTIVE: Add an audit_log D1 table (migration 003) and write an audit record on every state-changing API operation (POST, PATCH, DELETE). Add GET /audit endpoint for TENANT_ADMIN+ to query audit history.

REPOSITORY CONTEXT:
- D1 database binding: c.env.DB
- All state changes happen in src/modules/production-mgmt/index.ts
- actor_id always comes from c.get('user').sub
- actor_role always comes from c.get('user').role
- This is a multi-tenant platform — audit records must always include tenant_id from JWT

AUDIT_LOG TABLE SCHEMA:
id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL ('CREATE'|'UPDATE'|'DELETE'|'STATUS_CHANGE'), actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, old_value TEXT (JSON), new_value TEXT (JSON), created_at TEXT DEFAULT datetime('now')

REQUIRED DELIVERABLES:
1. migrations/003_audit_log.sql — creates audit_log table with compound index on (tenant_id, entity_type, entity_id)
2. Helper function writeAuditLog(db, entry) that inserts an audit record
3. Every POST endpoint calls writeAuditLog with action='CREATE'
4. Every PATCH endpoint captures old state first, then calls writeAuditLog with old_value + new_value
5. Every DELETE endpoint captures old state first, then calls writeAuditLog
6. GET /audit endpoint (TENANT_ADMIN+ only) with ?entityType=&entityId=&page=&pageSize= query params

ACCEPTANCE CRITERIA:
- No audit record created for GET operations
- Audit records are never deleteable via API (no DELETE /audit endpoint)
- audit_log.tenant_id always matches JWT tenant — never from request body
- writeAuditLog failure does not fail the primary response (log error, continue)

GOVERNANCE: Read Blueprint Part 6.1 (Security), Part 10.x (Production Vertical).
IMPORTANT REMINDERS: Thoroughness — capture both old and new values on UPDATE.
```

---

### PROMPT-E05: Implement Paystack Integration

```
You are an expert payments engineer implementing Paystack API integration for the WebWaka Production Suite.

REPO: webwaka-production
OBJECTIVE: Implement the PaystackClient.initializePayment() and PaystackClient.verifyPayment() methods in src/core/paystack.ts using real fetch() calls. Add a /webhooks/paystack endpoint to worker.ts with HMAC-SHA512 signature verification.

REPOSITORY CONTEXT:
- PaystackClient class exists in src/core/paystack.ts as a stub
- PAYSTACK_SECRET_KEY is available as c.env.PAYSTACK_SECRET_KEY (Cloudflare Workers binding)
- ALL monetary values are in kobo (INTEGER). NEVER use floats.
- This is a multi-repo platform — the payment UI (authorization_url redirect) lives in the frontend, not in this worker
- Invariant 5 (Nigeria First): support card, bank_transfer, ussd, mobile_money channels

PAYSTACK API DOCS:
- Initialize: POST https://api.paystack.co/transaction/initialize
  - Headers: Authorization: Bearer {PAYSTACK_SECRET_KEY}, Content-Type: application/json
  - Body: { email, amount (kobo), reference, callback_url, metadata, channels }
- Verify: GET https://api.paystack.co/transaction/verify/{reference}
  - Headers: Authorization: Bearer {PAYSTACK_SECRET_KEY}
- Webhook: Validate HMAC-SHA512 of raw request body using PAYSTACK_SECRET_KEY
  - Header: X-Paystack-Signature

REQUIRED DELIVERABLES:
1. PaystackClient.initializePayment() — live fetch() to Paystack API
2. PaystackClient.verifyPayment() — live fetch() to Paystack verify endpoint
3. /webhooks/paystack route in worker.ts (public, before JWT middleware)
4. Webhook HMAC validation (reject with 401 on invalid signature)
5. HMAC computed using SubtleCrypto (available in Workers runtime)

ACCEPTANCE CRITERIA:
- initializePayment() returns valid authorizationUrl from Paystack
- verifyPayment() returns transaction status correctly
- Webhook with invalid signature returns 401
- All amounts in kobo — no float arithmetic
- Payment reference format: PROD-{tenantId[:8]}-{timestamp}-{random}

GOVERNANCE: Read src/core/paystack.ts stub for interface contracts.
IMPORTANT REMINDERS: NEVER log PAYSTACK_SECRET_KEY. ALWAYS verify webhooks before processing.
```

---

### PROMPT-E06: Replace Local AI with @webwaka/core/ai

```
You are a platform engineer enforcing Invariant 1 (Build Once Use Infinitely) in the WebWaka Production Suite.

REPO: webwaka-production
OBJECTIVE: Delete src/core/ai.ts (the local AI stub that violates Invariant 1) and replace all usages with the canonical AIEngine from @webwaka/core/ai.

REPOSITORY CONTEXT:
- @webwaka/core is installed and provides @webwaka/core/ai (AIEngine class)
- src/core/ai.ts is a stub that throws errors — it has zero real functionality
- Invariant 1: ALL shared primitives come from @webwaka/core — NEVER re-implement locally
- This repo is one of many WebWaka verticals — the AI abstraction is managed centrally

STEPS:
1. Delete src/core/ai.ts
2. Find all import statements referencing the local AI module
3. Replace them with: import { AIEngine } from '@webwaka/core/ai';
4. Verify TypeScript compiles cleanly (npm run typecheck)
5. Test that AI-adjacent endpoints work without errors

REQUIRED DELIVERABLES:
1. src/core/ai.ts deleted
2. All local AI imports updated to @webwaka/core/ai
3. TypeScript compilation passes

GOVERNANCE: Read @webwaka/core package exports (node_modules/@webwaka/core/package.json) to confirm AIEngine API.
```

---

### PROMPT-E07: Add Structured Logging

```
You are a platform reliability engineer implementing structured logging in the WebWaka Production Suite.

REPO: webwaka-production
OBJECTIVE: Replace all console.error/console.warn/console.log calls in production code with structured logging via @webwaka/core/logger. Import createLogger, create a module-level logger, and use logger.error(), logger.info(), logger.warn() throughout.

REPOSITORY CONTEXT:
- @webwaka/core/logger is available (confirmed in package exports)
- Current console.error usage: src/worker.ts line 107 (error handler)
- CI pipeline already blocks console.log — extend this to block console.error via ESLint (prep for E16)
- This is a multi-tenant platform — all log entries must include tenantId when available

REQUIRED DELIVERABLES:
1. Import createLogger from @webwaka/core/logger in worker.ts and production-mgmt/index.ts
2. Create logger instances with vertical: 'production', version: '1.0.0'
3. Replace console.error in error handler with logger.error({ err, path, tenantId })
4. Add logger.info calls for: order created, order status changed, quality check recorded
5. Verify: grep -r "console\." src/ --include="*.ts" --exclude="*.test.ts" returns zero matches

GOVERNANCE: Never log JWT tokens, secrets, or PII. Include tenantId in all log entries.
```

---

### PROMPT-E08: Add Offline Sync Endpoint

```
You are an expert offline-first API engineer implementing the sync endpoint for the WebWaka Production Suite.

REPO: webwaka-production
OBJECTIVE: Implement POST /api/production/mgmt/sync — a batch endpoint that accepts an array of offline mutations from the Dexie client and applies each one to D1. Return per-item success/failure.

REPOSITORY CONTEXT:
- The Dexie offline database is defined in src/db/db.ts with MutationQueueItem type
- The sync endpoint must be idempotent (same mutation processed twice = success)
- This endpoint IS covered by JWT auth middleware (not a public endpoint)
- Rate limit: max 10 sync calls per tenant per minute
- Maximum batch size: 100 mutations

REQUEST SCHEMA (Zod):
mutations: array of { id: string, operation: 'CREATE'|'UPDATE'|'DELETE', resource: 'production_order'|'bill_of_material'|'quality_check', resourceId: UUID, payload: string (JSON), clientTimestamp: datetime }

RESPONSE:
{ success: true, results: [{ id: string, success: boolean, serverTimestamp?: string, error?: string }] }

REQUIRED DELIVERABLES:
1. POST /api/production/mgmt/sync route in production-mgmt/index.ts
2. Zod validation for sync payload
3. Per-mutation processing: CREATE → INSERT (ignore if exists), UPDATE → UPDATE (ignore if not found), DELETE → DELETE (ignore if not found)
4. Per-item result array in response
5. Audit log entry per processed mutation (reuse writeAuditLog from E04)
6. Rate limiting: reject with 429 if > 10 calls per minute

ACCEPTANCE CRITERIA:
- Empty mutations array → 200 with empty results
- Mutations over limit 100 → 422
- Same CREATE mutation twice → success both times (idempotent)
- DELETE mutation for non-existent record → success (idempotent)
- tenant_id enforced: mutations for other tenants rejected with per-item error

IMPORTANT REMINDERS:
- Offline First is non-negotiable — this endpoint is the bridge from Dexie to D1
- Idempotency is required — offline clients may retry failed sync
```

---

### PROMPT-E09: PWA Service Worker

```
You are a PWA engineer implementing a full service worker setup for the WebWaka Production Suite React UI.

REPO: webwaka-production
OBJECTIVE: Install vite-plugin-pwa and configure it with a Workbox service worker, PWA manifest, and icon assets. Register the service worker in src/main.tsx. The result must pass Lighthouse PWA audit ≥ 90.

REPOSITORY CONTEXT:
- Frontend: React 19 + Vite 8 (configured in vite.config.ts)
- The app is for Nigerian manufacturing users — mobile-first, poor connectivity
- Target devices: Android Chrome (most common in Nigeria)
- The app shell must be < 200KB for 3G users

INSTALL: npm install vite-plugin-pwa --save-dev

MANIFEST CONFIG:
- name: 'WebWaka Production Suite'
- short_name: 'WK Production'
- theme_color: '#0f172a'
- background_color: '#0f172a'
- display: 'standalone'
- icons: 192x192 and 512x512 (generate placeholder icons using canvas or import existing)

WORKBOX STRATEGY:
- API calls (/api/*): NetworkFirst, 3s timeout, fallback to cache
- Static assets: CacheFirst
- Navigation: NetworkFirst fallback to cached index.html

REQUIRED DELIVERABLES:
1. vite-plugin-pwa installed and configured in vite.config.ts
2. PWA manifest with correct branding
3. Service worker registered in src/main.tsx using virtual:pwa-register/react
4. Placeholder icon files in public/icons/ (192px and 512px)
5. Offline capability verified: app loads without network

ACCEPTANCE CRITERIA:
- Lighthouse PWA score ≥ 90 (run: npx lighthouse http://localhost:5000 --only-categories=pwa)
- App shows install prompt on Android Chrome
- App loads in offline mode after first visit

GOVERNANCE: Read vite.config.ts before modifying it. Do not break existing host/port configuration.
```

---

### PROMPT-E14: Nigeria-First Fields

```
You are a domain expert implementing Nigeria-specific manufacturing fields for the WebWaka Production Suite.

REPO: webwaka-production
OBJECTIVE: Add energy_cost_kobo, generator_fuel_litres, and compliance_reference fields to the production_orders table (migration 006). Update the API to accept these fields on POST/PATCH. Update GET /orders/:id to return them.

REPOSITORY CONTEXT:
- Energy costs represent ~40% of Nigerian manufacturing operating costs
- All monetary fields must be INTEGER kobo (not float)
- NAFDAC/SON reference numbers are needed for regulated product compliance
- This repo does NOT manage NAFDAC database — compliance_reference is a free-text field

NEW FIELDS:
- energy_cost_kobo INTEGER DEFAULT 0 (generator diesel, grid electricity cost for this order)
- generator_fuel_litres REAL (optional — diesel consumed for this order)
- compliance_reference TEXT (optional — NAFDAC batch number, SON reference, etc.)

REQUIRED DELIVERABLES:
1. migrations/006_nigeria_fields.sql with the 3 new columns
2. createOrderSchema updated to include optional new fields
3. POST /orders handler stores new fields
4. PATCH /orders/:id handler allows updating energy_cost_kobo
5. GET /orders/:id returns new fields
6. GET /analytics/kpis includes total energy_cost_kobo for the period

ACCEPTANCE CRITERIA:
- POST /orders with energy_cost_kobo: 50000 stores 50000 (₦500)
- GET /orders/:id returns energy_cost_kobo: 50000 (never float)
- compliance_reference accepts any string up to 100 chars
```

---

### PROMPT-E15: Raise Test Coverage

```
You are a QA engineer raising test quality for the WebWaka Production Suite.

REPO: webwaka-production
OBJECTIVE: Raise Vitest line coverage threshold from 30% to 80%. Add integration tests using Miniflare for D1 query testing. Add cross-tenant isolation tests for all endpoints. Add Zod schema validation tests.

REPOSITORY CONTEXT:
- Current threshold: 30% lines (vitest.config.ts)
- CHANGELOG states ">90%" target — update to "80%" as current milestone
- Existing tests in src/modules/production-mgmt/index.test.ts — do not delete, only add
- Use @cloudflare/vitest-pool-workers or miniflare for D1 integration

REQUIRED DELIVERABLES:
1. vitest.config.ts — lines threshold: 80, functions: 90, branches: 85, statements: 80
2. New integration test file: src/modules/production-mgmt/integration.test.ts
3. Integration tests: all 8 endpoints + sync endpoint with real D1
4. Cross-tenant tests: create as tenant A, read as tenant B → 0 results
5. Zod schema tests: each schema tested with 5 invalid and 2 valid inputs
6. Audit log tests: verify audit record created on each mutation

ACCEPTANCE CRITERIA:
- npm run test:coverage produces ≥ 80% line coverage
- All cross-tenant tests pass
- CI pipeline fails when coverage drops below threshold

IMPORTANT REMINDERS:
- Zero Skipping: every endpoint needs a cross-tenant test
- Thoroughness: test both success and error paths
```

---

### PROMPT-E16: ESLint Configuration

```
You are a code quality engineer configuring ESLint for the WebWaka Production Suite.

REPO: webwaka-production
OBJECTIVE: Add ESLint with TypeScript support. Create eslint.config.js (flat config). Add npm run lint script. Add lint step to CI pipeline. The no-console rule replaces the fragile grep check in deploy.yml.

INSTALL: npm install eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-import --save-dev

KEY RULES:
- @typescript-eslint/no-explicit-any: 'error'
- @typescript-eslint/no-floating-promises: 'error'
- no-console: 'error' (enforces structured logging)
- eqeqeq: 'error'
- import/no-duplicates: 'warn'

REQUIRED DELIVERABLES:
1. eslint.config.js (flat config format)
2. package.json: "lint": "eslint src/ --ext .ts,.tsx"
3. .github/workflows/deploy.yml: replace grep console.log check with: npm run lint

ACCEPTANCE CRITERIA:
- npm run lint passes on current codebase (fix any existing violations first)
- CI fails on lint errors
- Removing the old console.log grep check from CI (it's now handled by ESLint)
```

---

### PROMPT-B03: Fix Coverage Threshold

```
You are fixing a misconfiguration in vitest.config.ts for the WebWaka Production Suite.

REPO: webwaka-production
OBJECTIVE: Change the lines coverage threshold from 30 to 80 in vitest.config.ts. This is a one-line change.

CURRENT:
thresholds: { lines: 30, functions: 80, branches: 80, statements: 30 }

CHANGE TO:
thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 }

Also update CHANGELOG.md: replace ">90% coverage thresholds enforced" with "80% coverage thresholds (lines, statements); 80%+ functions/branches".

ACCEPTANCE CRITERIA:
- npm run test:coverage reports thresholds as 80% lines
- CI fails if line coverage drops below 80%
```

---

### PROMPT-B04: WAREHOUSE_STAFF Role Access

```
You are implementing role-based access control for WAREHOUSE_STAFF in the WebWaka Production Suite.

REPO: webwaka-production
OBJECTIVE: WAREHOUSE_STAFF role is defined in auth.ts but has no route access. Define and implement their access policy: read orders, read/update BOM quantity_used, no quality check or order management.

ACCESS POLICY:
- GET /orders: include WAREHOUSE_STAFF
- GET /orders/:id: include WAREHOUSE_STAFF
- GET /orders/:orderId/bom: include WAREHOUSE_STAFF
- PATCH /orders/:orderId/bom/:itemId (new): WAREHOUSE_STAFF can update quantity_used
- GET /orders/:orderId/quality: include WAREHOUSE_STAFF (read only)
- POST /orders/: NOT allowed for WAREHOUSE_STAFF
- POST /orders/:orderId/quality: NOT allowed for WAREHOUSE_STAFF

REQUIRED DELIVERABLES:
1. WAREHOUSE_STAFF added to requireRole arrays on applicable GET routes
2. New PATCH /orders/:orderId/bom/:itemId endpoint for quantity_used updates
3. Tests verifying WAREHOUSE_STAFF permissions

GOVERNANCE: Read auth.ts for PRODUCTION_ROLES constants.
```

---

## 8. QA PROMPTS

---

### QA-PROMPT-E01: Verify D1 Database Queries

```
You are an expert QA engineer verifying the D1 database implementation in the WebWaka Production Suite.

REPO: webwaka-production
OBJECTIVE: Verify that all 8 D1 database endpoints in src/modules/production-mgmt/index.ts are correctly implemented with real Cloudflare D1 queries, tenant isolation, proper error codes, and accurate pagination.

WHAT TO VERIFY:

1. PERSISTENCE: For each of the 8 endpoints, verify data persists:
   - POST /orders → record appears in GET /orders
   - PATCH /orders/:id → record updated, updated_at changed
   - DELETE /orders/:id → record removed
   - POST /orders/:orderId/bom → BOM item appears in GET /orders/:orderId/bom
   - POST /orders/:orderId/quality → check appears in GET /orders/:orderId/quality

2. TENANT ISOLATION (CRITICAL): For every endpoint:
   - Create a JWT for tenant-A, create records
   - Switch to tenant-B JWT
   - Verify tenant-B cannot see tenant-A's records (0 results, 404)
   - Verify PATCH/DELETE by tenant-B on tenant-A's records returns 404

3. PAGINATION: GET /orders
   - Create 25 records for a tenant
   - GET /orders → page=1, pageSize=20 → 20 records, total=25, totalPages=2
   - GET /orders?page=2&pageSize=20 → 5 records
   - GET /orders?pageSize=999 → capped at 100

4. ERROR CODES:
   - PATCH /orders/:id with non-existent ID → 404
   - DELETE /orders/:id with non-existent ID → 404
   - POST /orders/:orderId/bom with non-existent orderId → 404

5. SQL INJECTION: Verify all queries use prepared statements (.bind()) — grep for string concatenation in queries

6. QUANTITY: Verify milli-unit storage (if B01 fix applied): POST quantity:1.5, GET returns 1.5

BUGS TO LOOK FOR:
- Missing WHERE tenant_id = ? on any query
- updated_at not updated on PATCH
- Total count query counting across all tenants
- Float arithmetic errors in quantity fields
- order_number collisions under concurrent load

REGRESSION CHECK:
- Run npm test — all existing 16 tests must still pass

DONE WHEN: All persistence tests pass, all tenant isolation tests pass, all pagination tests pass, all error code tests pass.
```

---

### QA-PROMPT-E02: Verify Zod Validation

```
You are a QA engineer verifying Zod input validation for the WebWaka Production Suite.

REPO: webwaka-production
OBJECTIVE: Verify that all POST/PATCH endpoints reject invalid input with 422 status and field-level error messages.

TEST CASES TO EXECUTE:

POST /orders:
- { quantity: -1 } → 422, error mentions "quantity"
- { productName: "" } → 422
- { productName: "A".repeat(256) } → 422 (max 255)
- {} → 422 (multiple errors)
- { productName: "Widget", quantity: 100, unit: "units" } → 201 (valid)
- { productName: "Widget", quantity: 100, unit: "units", scheduledEndDate: "2025-01-01", scheduledStartDate: "2025-12-01" } → 422 (end before start)

POST /orders/:id/bom:
- {} → 422
- { componentName: "Steel", quantityRequired: -5, unit: "kg" } → 422
- { componentName: "Steel", quantityRequired: 5, unit: "kg" } → 201

POST /orders/:id/quality:
- { checkType: "INVALID" } → 422
- { checkType: "FINAL", result: "PASS" } → 201
- {} → 422

PATCH /orders/:id:
- {} → 422 (at least one field required)
- { status: "INVALID_STATUS" } → 422
- { status: "COMPLETED" } → 200 (valid)

BUGS TO LOOK FOR:
- Valid inputs returning 422 (over-strict schema)
- Invalid inputs accepted (under-strict schema)
- Non-JSON body causing crash instead of 400
- Missing Content-Type: application/json causing silent failure

DONE WHEN: All 422 cases return 422 with field errors, all valid cases return 201/200.
```

---

### QA-PROMPT-E04: Verify Audit Log

```
You are a compliance QA engineer verifying the audit log implementation for the WebWaka Production Suite.

REPO: webwaka-production
OBJECTIVE: Verify that every state-changing operation creates an audit_log entry, and that the GET /audit endpoint returns correct history.

TEST CASES:

1. CREATE audit:
   - POST /orders → audit_log entry with action='CREATE', entity_type='production_order', new_value contains full order JSON
   - Verify actor_id = user.sub from JWT
   - Verify tenant_id = tenantId from JWT

2. UPDATE audit:
   - PATCH /orders/:id status DRAFT→IN_PROGRESS → audit entry action='STATUS_CHANGE', old_value.status='DRAFT', new_value.status='IN_PROGRESS'
   - Verify old_value and new_value are both present and are valid JSON

3. DELETE audit:
   - DELETE /orders/:id → audit entry action='DELETE', old_value contains deleted record

4. READ non-audit: GET /orders → no audit log entry created

5. Tenant isolation: GET /audit as tenant-B → cannot see tenant-A's audit records

6. No delete endpoint: attempting DELETE /audit → 404 or 405

7. GET /audit filters:
   - ?entityType=production_order&entityId=:id → returns only that order's history
   - Chronological order (most recent first)

BUGS TO LOOK FOR:
- Audit entry created even when main operation failed
- old_value missing on UPDATE (captured after change, not before)
- audit_log.tenant_id taken from request body instead of JWT

DONE WHEN: All 7 test scenarios pass, no audit records created for GETs.
```

---

### QA-PROMPT-E05: Verify Paystack Integration

```
You are a payments QA engineer verifying Paystack integration for the WebWaka Production Suite.

REPO: webwaka-production
OBJECTIVE: Verify Paystack initializePayment, verifyPayment, and webhook endpoint work correctly.

SETUP: Use Paystack test keys. Reference: https://paystack.com/docs/payments/accept-payments

TEST CASES:

1. initializePayment():
   - Call with email: test@webwaka.app, amountKobo: 100000 (₦1,000)
   - Verify response.data.authorizationUrl is a valid URL
   - Verify response.data.reference matches the format PROD-{...}
   - Verify amount NOT sent as naira (10.00) — must be 100000

2. verifyPayment():
   - Use a test reference from step 1
   - Verify response.data.status is 'success', 'failed', or 'abandoned'

3. Webhook HMAC validation:
   - Send POST /webhooks/paystack with valid X-Paystack-Signature → 200
   - Send POST /webhooks/paystack with invalid/missing X-Paystack-Signature → 401
   - Tamper with body after signing → 401

4. Duplicate webhook:
   - Send same webhook event twice → idempotent (no double-processing)

BUGS TO LOOK FOR:
- HMAC computed with SHA-256 instead of SHA-512
- Secret key logged to console/logger
- Webhook returns 200 but processes asynchronously (must return 200 synchronously first)

DONE WHEN: initializePayment returns valid URL, verifyPayment returns correct status, webhook validation rejects tampering.
```

---

### QA-PROMPT-E08: Verify Offline Sync Endpoint

```
You are a QA engineer verifying the offline sync endpoint for the WebWaka Production Suite.

REPO: webwaka-production
OBJECTIVE: Verify that POST /api/production/mgmt/sync correctly processes offline mutations, returns per-item results, and is idempotent.

TEST CASES:

1. Happy path:
   - Send 3 CREATE mutations → 200, results array has 3 successes
   - Verify D1 has 3 new records

2. Idempotency:
   - Send same 3 CREATE mutations again → 200, results array has 3 successes (not errors)
   - D1 still has 3 records (not 6)

3. Mixed batch:
   - Send [CREATE order1, UPDATE order1 status, CREATE bom_item] → all succeed in order

4. DELETE idempotency:
   - Send DELETE for non-existent record → success (not error)

5. Batch limit:
   - Send 101 mutations → 422

6. Tenant isolation:
   - Tenant-A JWT sending mutations with tenant-B resourceId → per-item error, not global error

7. Rate limiting:
   - Send 11 sync requests in 1 minute → 11th returns 429

8. Empty batch:
   - Send { mutations: [] } → 200, results: []

BUGS TO LOOK FOR:
- Mutations processed out of order (UPDATE before CREATE)
- Sync endpoint missing JWT auth (public access)
- Failed individual mutation fails entire batch
- Rate limit not per-tenant (per-IP only)

DONE WHEN: All 8 test scenarios pass.
```

---

### QA-PROMPT-E09: Verify PWA Service Worker

```
You are a PWA QA engineer verifying the service worker implementation for the WebWaka Production Suite.

REPO: webwaka-production
OBJECTIVE: Verify the app is a fully functional PWA with offline capability.

TEST PROCEDURE:

1. Lighthouse audit:
   - Run: npx lighthouse http://localhost:5000 --only-categories=pwa --output=json
   - Verify score ≥ 90
   - Verify: "Is installable" passes, "Has a PWA page transition" passes

2. Offline mode:
   - Load the app in Chrome
   - Go to DevTools → Network → set "Offline"
   - Reload the page → app must load from service worker cache
   - Verify production orders previously loaded appear from Dexie cache

3. Install prompt:
   - Open app in Chrome on Android (or use DevTools "mobile" mode)
   - Verify "Add to Home Screen" prompt appears

4. Service worker update:
   - Build app (npm run build:ui)
   - Serve with: npx serve dist -l 5000
   - Load in browser
   - Make a trivial code change and rebuild
   - Re-serve → verify service worker prompts for update

5. Network fallback:
   - Go online, load orders
   - Go offline, navigate to orders → Dexie cache shown

BUGS TO LOOK FOR:
- Service worker not registered (check Application → Service Workers in DevTools)
- Manifest not linked in index.html
- Icons not found (404 for icon files)
- API cache-busting not working (stale API data after server change)

DONE WHEN: Lighthouse PWA ≥ 90, offline mode works, install prompt appears.
```

---

### QA-PROMPT-E15: Verify Test Coverage

```
You are a QA engineer verifying test coverage for the WebWaka Production Suite.

REPO: webwaka-production
OBJECTIVE: Verify that Vitest line coverage is ≥ 80% and that cross-tenant isolation is tested for all endpoints.

TEST PROCEDURE:

1. Run coverage: npm run test:coverage
   - Verify output shows: Lines: ≥ 80%, Statements: ≥ 80%, Functions: ≥ 80%, Branches: ≥ 80%
   - CI must fail if any threshold is missed

2. Verify cross-tenant tests exist for:
   - GET /orders (tenant B sees 0 results for tenant A's orders)
   - GET /orders/:id (tenant B gets 404 for tenant A's order)
   - PATCH /orders/:id (tenant B gets 404)
   - DELETE /orders/:id (tenant B gets 404)
   - GET /orders/:orderId/bom (tenant B gets 404/empty)
   - GET /orders/:orderId/quality (tenant B gets 404/empty)

3. Verify Zod schema tests:
   - Each of 4 schemas (createOrder, patchOrder, createBOM, createQuality) tested with ≥ 3 invalid and 1 valid input

4. Verify audit log tests:
   - POST triggers audit
   - PATCH triggers audit with old+new values
   - DELETE triggers audit

5. grep for TODO in test files:
   - Verify no TODO or 'skip' or 'pending' comments in test files

BUGS TO LOOK FOR:
- Test mocking D1 but not verifying SQL called with correct tenantId binding
- Coverage reported high because tests only hit the "happy path" branch

DONE WHEN: npm run test:coverage passes all thresholds, cross-tenant tests all green.
```

---

## 9. PRIORITY ORDER & DEPENDENCY MAP

### Execution Order

```
Layer 0 (Blockers — must run first):
  B03 (fix coverage threshold) — 30 min
  B05 (fix console.error) — 30 min
  B06 (remove local AI stub) = E06 — 1 hour

Layer 1 (Foundation — required for everything else):
  E01 (D1 queries) — 4-6 hours [depends on: B01, B02 inline]
  E02 (Zod validation) — 2-3 hours [can parallel with E01]
  E03 (GET /orders/:id) — 1-2 hours [depends on: E01]

Layer 2 (Core Feature Completion):
  E04 (audit log) — 3-4 hours [depends on: E01]
  E07 (structured logging) — 1-2 hours [depends on: B05]
  E08 (offline sync) — 3-4 hours [depends on: E01, E02]
  E09 (PWA service worker) — 3-4 hours [independent of E01]
  B04 (WAREHOUSE_STAFF role) — 2 hours [depends on: E01]

Layer 3 (Business Features):
  E05 (Paystack) — 4-6 hours [depends on: E01]
  E10 (BOM cost fields) — 2-3 hours [depends on: E01, E03]
  E11 (QC defect classification) — 2-3 hours [depends on: E01, E04]
  E12 (KPIs endpoint) — 3-4 hours [depends on: E01, E10]
  E13 (event publishing) — 2-3 hours [depends on: E01]
  E14 (Nigeria-specific fields) — 2 hours [depends on: E01]

Layer 4 (Quality & Operations):
  E15 (raise test coverage) — 6-8 hours [depends on: E01-E04]
  E16 (ESLint) — 2 hours [depends on: B05]
  E17 (PDF/Excel export) — 4-5 hours [depends on: E01, E10, E11]
  E18 (BOM versioning) — 3-4 hours [depends on: E01, E10]
  E19 (status machine) — 2-3 hours [depends on: E01, E11]
  E20 (Playwright E2E) — 6-8 hours [depends on: E09, UI implementation]
```

### Dependency Map

```
B01 ──────────────────────────────────────────────────────────► E01
B02 ──────────────────────────────────────────────────────────► E01
E02 ─────────────────────────────────────────────────────────┐
E01 ─────────────────────────────────────────────────────────┼► E03
                                                             └► E04 ─► E11 ─► E19
E01 ─────────────────────────────────────────────────────────► E08
E01, E02 ────────────────────────────────────────────────────► E08
E01, E03 ────────────────────────────────────────────────────► E10 ─► E12
E01, E04 ────────────────────────────────────────────────────► E11
E01 ─────────────────────────────────────────────────────────► E13
E01 ─────────────────────────────────────────────────────────► E14
E01...E04 ───────────────────────────────────────────────────► E15
E09 ─────────────────────────────────────────────────────────► E20
```

---

## 10. PHASE 1 / PHASE 2 SPLIT

### Phase 1 — Make It Functional (P0 + P1 tasks)
**Goal:** A working system with real data persistence, validation, security, and offline support.
**Timeline estimate:** 3-4 weeks of focused implementation

| Task | Category | Estimated Hours |
|---|---|---|
| B01 — Fix quantity type | Bug | 2 |
| B02 — Fix order_number | Bug | 1 |
| B03 — Fix coverage threshold | Bug | 0.5 |
| B05 — Fix console.error | Bug | 0.5 |
| E06 / B06 — Remove local AI stub | Invariant | 1 |
| E01 — Implement D1 queries | Feature | 6 |
| E02 — Zod validation | Feature | 3 |
| E03 — GET /orders/:id | Feature | 2 |
| E04 — Audit log | Compliance | 4 |
| E07 — Structured logging | Observability | 2 |
| E08 — Offline sync endpoint | Offline-First | 4 |
| E09 — PWA service worker | PWA | 4 |
| B04 — WAREHOUSE_STAFF role | RBAC | 2 |
| B08 — 404 on non-existent | Bug | 0 (in E01) |
| **Phase 1 Total** | | **~32 hours** |

### Phase 2 — Make It World-Class (P2 + P3 tasks)
**Goal:** Full business features, analytics, exports, compliance, and test coverage.
**Timeline estimate:** 4-6 weeks

| Task | Category | Estimated Hours |
|---|---|---|
| E05 — Paystack implementation | Payments | 6 |
| E10 — BOM cost fields | Business | 3 |
| E11 — QC defect classification | Quality | 3 |
| E12 — KPIs endpoint | Analytics | 4 |
| E13 — Event publishing | Platform | 3 |
| E14 — Nigeria-specific fields | Nigeria-First | 2 |
| E15 — Raise test coverage | Quality | 8 |
| E16 — ESLint | Code Quality | 2 |
| E17 — PDF/Excel export | Operations | 5 |
| E18 — BOM versioning | Data Integrity | 4 |
| E19 — Status machine | API | 3 |
| E20 — Playwright E2E | Testing | 8 |
| **Phase 2 Total** | | **~51 hours** |

---

## 11. REPO CONTEXT & ECOSYSTEM NOTES

### This repo is NOT standalone

`webwaka-production` is one component in the WebWaka OS v4 multi-repo platform. The following capabilities explicitly live in OTHER repos:

| Capability | Owner Repo |
|---|---|
| Tenant creation & provisioning | `webwaka-super-admin-v2` |
| User registration & management | `webwaka-super-admin-v2` |
| JWT signing (only validation here) | `webwaka-super-admin-v2` |
| Global RBAC schema definitions | `webwaka-super-admin-v2` |
| Inventory management | `webwaka-inventory` (planned) |
| Core auth/RBAC/logging primitives | `@webwaka/core` npm package |
| AI engine (OpenRouter abstraction) | `@webwaka/core/ai` |
| Event bus / PubSub | `@webwaka/core/events` |
| Push notifications | `@webwaka/core/notifications` |
| Billing & subscription management | `@webwaka/core/billing` |

### Cross-repo contracts this repo must honor

1. **JWT payload shape** — must accept JWTPayload from `@webwaka/core` without modification
2. **tenantId sourcing** — always from JWT, never from request — cross-repo invariant
3. **Event schema** — domain events must use the event type naming convention from `@webwaka/core/events`
4. **Kobo-only monetary values** — Paystack and all billing in kobo integers (cross-platform standard)
5. **OpenRouter for AI** — never call AI providers directly (cross-platform invariant)

### What Replit Agent can and cannot implement

**CAN implement (within this repo):**
- All D1 queries, routes, middleware, business logic
- Schema migrations (for THIS repo's D1 database)
- Frontend React components and UI
- Vite config, PWA setup
- Paystack API integration (fetch calls from Worker)
- OpenRouter AI calls (via @webwaka/core/ai)
- Audit log, structured logging, events publishing
- Unit and integration tests
- CI/CD workflow enhancements

**CANNOT implement (lives in other repos):**
- Tenant provisioning or user creation
- JWT signing logic
- Global RBAC schema changes
- Inventory management features
- Changes to @webwaka/core npm package

---

## 12. GOVERNANCE & REMINDER BLOCK

### Platform Invariants (ALL must be enforced at all times)

| Invariant | What it means in this repo |
|---|---|
| **Build Once Use Infinitely** | ALL auth, logging, AI, events come from `@webwaka/core`. Never re-implement. |
| **Mobile First** | API responses minimal. UI optimized for 320px screens. Data-saver mode supported. |
| **PWA First** | Service worker required. App installable. Offline mode functional. |
| **Offline First** | Every write goes through Dexie first. Sync endpoint must be idempotent. |
| **Nigeria First** | ALL monetary values in kobo (INTEGER). en-NG default locale. Paystack payment channels include ussd + bank_transfer. |
| **Africa First** | i18n strings must exist for all 7 locales. |
| **Vendor Neutral AI** | ONLY use `@webwaka/core/ai` (OpenRouter). Never import from openai, anthropic, or any provider SDK directly. |

### Security mandates (non-negotiable)

- `tenantId` ALWAYS from validated JWT payload — NEVER from request body, query params, or headers
- ALL D1 queries use prepared statements (`.prepare().bind()`) — NO string interpolation
- ALL monetary values are integers in kobo — NEVER floats
- NEVER log JWT tokens, API keys, or secrets
- CORS: only allowlisted origins (NO wildcard `*`) in production
- Webhook payloads ALWAYS verified with HMAC before processing

### Code quality mandates

- Zero `console.*` in production code (use `@webwaka/core/logger`)
- TypeScript strict mode — no `any` except where explicitly required
- All new routes must have RBAC enforcement (`requireRole`)
- Coverage ≥ 80% (lines, statements, functions, branches)
- All PRs must pass CI before merge

---

## 13. EXECUTION READINESS NOTES

### Before starting Phase 1

1. **Provision Cloudflare D1** — The `wrangler.toml` references real D1 database IDs. Verify these are provisioned and accessible: `npx wrangler d1 list`
2. **Apply migration 001** — `npx wrangler d1 migrations apply webwaka-production-db-dev`
3. **Set JWT_SECRET** — `npx wrangler secret put JWT_SECRET` (required for JWT validation)
4. **Confirm @webwaka/core version** — v1.3.2 is installed; verify sub-module exports available
5. **Run typecheck** — `npm run typecheck` must pass before any work begins
6. **Run tests** — `npm test` — all 16 existing tests should pass

### Cloudflare credentials needed

| Secret | How to set | Who provides |
|---|---|---|
| CLOUDFLARE_API_TOKEN | GitHub Actions secret | Platform team |
| CLOUDFLARE_ACCOUNT_ID | GitHub Actions secret | Platform team |
| JWT_SECRET | `wrangler secret put JWT_SECRET` | Platform team |
| PAYSTACK_SECRET_KEY | `wrangler secret put PAYSTACK_SECRET_KEY` | Business/Finance |
| OPENROUTER_API_KEY | `wrangler secret put OPENROUTER_API_KEY` | Platform team |

### Execution agents notes

- Each task above has a standalone implementation prompt and QA prompt
- Tasks can be executed by separate Replit Agent sessions
- Each agent must read the repo docs and governance block before starting
- Each agent must run `npm run typecheck` and `npm test` before and after their task
- No agent should modify `@webwaka/core`, `wrangler.toml` KV/D1 IDs, or `.github/workflows/deploy.yml` triggers without explicit instruction
- Migration files are append-only — never modify existing migration files
- All changes must pass CI (typecheck → test → lint) before being considered complete

### Definition of "done" for this taskbook

Phase 1 is complete when:
- [ ] All 8 D1 endpoints return real data
- [ ] All endpoints have Zod validation
- [ ] GET /orders/:id exists and works
- [ ] Audit log records every mutation
- [ ] console.error replaced with structured logger
- [ ] Offline sync endpoint works end-to-end
- [ ] PWA scores ≥ 90 on Lighthouse
- [ ] npm test passes with ≥ 80% line coverage
- [ ] npm run typecheck passes cleanly
- [ ] CI pipeline green on main branch

Phase 2 is complete when all items above PLUS:
- [ ] Paystack integration live and tested
- [ ] KPIs endpoint returns real data
- [ ] Event publishing live for all state changes
- [ ] Nigeria-specific fields in schema and API
- [ ] ESLint passing with no-console enforced
- [ ] Playwright E2E tests cover 5 main user flows
- [ ] BOM cost rollup working with formatKobo() display
- [ ] QC defect classification with NCR workflow

---

*Document generated: 2026-04-04*
*Repository: webwaka-production (WebWaka OS v4)*
*Ecosystem: Multi-repo platform — not standalone*
*Next review: After Phase 1 completion*
