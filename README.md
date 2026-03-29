# WebWaka Production Suite

> Part of the **WebWaka OS v4** platform — a multi-tenant, offline-first, Africa-focused vertical SaaS ecosystem.

The Production Suite manages manufacturing workflows for Nigerian and African businesses, covering production order management, bill of materials, quality control, and inventory integration.

## Platform Invariants

This repository enforces all 7 WebWaka OS core invariants without exception:

| Invariant | Implementation |
|---|---|
| **Build Once Use Infinitely** | All auth primitives imported from `@webwaka/core` — never re-implemented |
| **Mobile First** | Hono lightweight API; Dexie offline DB for React Native/PWA clients |
| **PWA First** | Cloudflare Workers + Pages; service worker ready |
| **Offline First** | Dexie IndexedDB mutation queue in `src/db/db.ts` |
| **Nigeria First** | Paystack (kobo integers only); en-NG default locale |
| **Africa First** | i18n stubs for en-NG, en-GH, en-KE, fr-CI, yo-NG, ha-NG, ig-NG |
| **Vendor Neutral AI** | OpenRouter abstraction in `src/core/ai.ts` — no direct provider imports |

## Architecture

The Production Suite follows the canonical WebWaka OS v4 architecture:

- **Runtime:** Cloudflare Workers (Hono framework)
- **Database:** Cloudflare D1 (SQLite at the edge)
- **Session Storage:** Cloudflare KV
- **Auth:** `@webwaka/core` — `validateJWT()`, `requireRole()`, `secureCORS()`, `rateLimit()`
- **Offline:** Dexie IndexedDB (client-side) with background sync to D1
- **Payments:** Paystack (NGN kobo integers only)
- **AI:** OpenRouter (vendor-neutral, no direct provider SDK)

## Security Model

Tenant isolation is enforced at every layer. The `tenantId` is **always** sourced from the validated JWT payload (`c.get('tenantId')`). It is never accepted from request bodies, query parameters, or headers. Every D1 query includes a `WHERE tenant_id = ?` clause.

RBAC roles for this vertical: `SUPER_ADMIN`, `TENANT_ADMIN`, `PRODUCTION_MANAGER`, `FLOOR_SUPERVISOR`, `QC_INSPECTOR`, `VIEWER`.

## Getting Started

```bash
npm install
npm run typecheck
npm test
npm run dev
```

## Deployment

```bash
# Apply D1 migrations
npx wrangler d1 migrations apply webwaka-production-db-staging --env staging

# Deploy Worker
npx wrangler deploy --env staging
```

## Module Roadmap

| Epic | Module | Status |
|---|---|---|
| PROD-1 | Production Order Management | Scaffold ready — D1 queries pending |
| PROD-1 | Bill of Materials | Scaffold ready — D1 queries pending |
| PROD-1 | Quality Control | Scaffold ready — D1 queries pending |
| PROD-2 | Inventory Integration | Planned |
| PROD-3 | AI Schedule Optimization | Planned |
| PROD-4 | Paystack Materials Procurement | Planned |
