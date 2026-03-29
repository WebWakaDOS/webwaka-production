# Changelog — WebWaka Production Suite

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [Unreleased]

### Added — Scaffold Foundation (2026-03-29)
- `package.json` — Hono, Cloudflare Workers, Dexie, Vitest, TypeScript stack
- `tsconfig.json` — strict mode, Cloudflare Workers types
- `vitest.config.ts` — 90% coverage thresholds enforced
- `wrangler.toml` — D1 database, KV namespaces, JWT_SECRET, ENVIRONMENT, Paystack, OpenRouter bindings
- `src/worker.ts` — canonical Hono entry point with `secureCORS()`, `rateLimit()`, `jwtAuthMiddleware()` from `@webwaka/core`
- `src/middleware/auth.ts` — re-exports all auth primitives from `@webwaka/core` (Invariant 1: Build Once Use Infinitely)
- `src/db/db.ts` — Dexie IndexedDB offline database with mutation queue (Invariant 4: Offline First)
- `src/i18n/index.ts` — i18n with en-NG default locale, kobo currency formatting (Invariant 5: Nigeria First, 6: Africa First)
- `src/core/paystack.ts` — Paystack integration stub with kobo-only monetary values (Invariant 5: Nigeria First)
- `src/core/ai.ts` — Vendor-neutral AI client via OpenRouter (Invariant 7: Vendor Neutral AI)
- `src/core/types.ts` — shared domain types, constants, and Cloudflare bindings interface
- `src/modules/production-mgmt/index.ts` — Production Orders, BOM, and Quality Checks router with full RBAC enforcement
- `src/modules/production-mgmt/index.test.ts` — 16 unit tests covering auth, tenant isolation, RBAC, and input validation
- `migrations/001_production_schema.sql` — D1 schema for production_orders, bill_of_materials, quality_checks
- `.github/workflows/deploy.yml` — 5-layer QA CI/CD pipeline with staging + production deploy and health checks

### Invariants Enforced
- ✅ Build Once Use Infinitely — all auth from `@webwaka/core`
- ✅ Mobile First — Hono lightweight API, Dexie offline DB
- ✅ PWA First — wrangler.toml configured for Pages + Workers
- ✅ Offline First — Dexie mutation queue in `src/db/db.ts`
- ✅ Nigeria First — Paystack kobo, en-NG locale
- ✅ Africa First — multi-locale i18n stubs (en-NG, en-GH, en-KE, fr-CI, yo-NG, ha-NG, ig-NG)
- ✅ Vendor Neutral AI — OpenRouter abstraction in `src/core/ai.ts`
