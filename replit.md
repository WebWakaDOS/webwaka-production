# WebWaka Production Suite

## Overview
WebWaka Production Suite is a manufacturing and production management vertical SaaS application, part of the WebWaka OS v4 ecosystem. Built with an Africa-First / Nigeria-First philosophy, it handles production orders, bill of materials, quality control, and supply chain workflows for African manufacturing businesses.

## Architecture

- **Backend Runtime:** Cloudflare Workers (not running locally — deployed to Cloudflare edge)
- **API Framework:** Hono (TypeScript)
- **Frontend:** React 19 + Vite (static SPA)
- **Primary DB:** Cloudflare D1 (SQLite at the edge)
- **Client-side DB:** Dexie.js (IndexedDB, offline-first sync)
- **Auth:** `@webwaka/core` (JWT, RBAC, CORS)
- **Payments:** Paystack (NGN kobo integers only)
- **AI:** OpenRouter (vendor-neutral abstraction)
- **Package Manager:** npm

## Project Layout

```
webwaka-production/
├── index.html              # Vite SPA entry point
├── vite.config.ts          # Vite config (host 0.0.0.0, port 5000)
├── src/
│   ├── main.tsx            # React entry point
│   ├── worker.ts           # Cloudflare Worker entry point
│   ├── core/               # AI platform client, Paystack, types
│   ├── db/                 # Dexie offline DB schema + sync
│   ├── i18n/               # Internationalization (en-NG, en-GH, etc.)
│   ├── middleware/         # Hono auth middleware
│   └── modules/
│       └── production-mgmt/ # Production orders, BOM, QC
├── migrations/             # Cloudflare D1 SQL migrations
├── wrangler.toml           # Cloudflare Workers configuration
└── package.json
```

## Development

```bash
npm install        # Install dependencies
npm run dev:ui     # Start Vite dev server (port 5000)
npm run typecheck  # TypeScript check
npm test           # Run Vitest tests
```

## Deployment

- **Frontend (Replit):** Static site — `npm run build:ui` → `dist/`
- **Backend (Cloudflare):** `npx wrangler deploy --env production`
- Cloudflare D1 migrations: `npx wrangler d1 migrations apply <db-name> --env <env>`

## Platform Invariants

1. Build Once Use Infinitely — auth from `@webwaka/core`, never re-implemented
2. Mobile First — lightweight Hono API, Dexie for offline PWA
3. PWA First — Cloudflare Workers + Pages ready
4. Offline First — Dexie IndexedDB mutation queue
5. Nigeria First — Paystack kobo integers, en-NG default
6. Africa First — i18n stubs for multiple African locales
7. Vendor Neutral AI — OpenRouter only, no direct provider SDK

## Security Model

- `tenantId` is ALWAYS sourced from validated JWT — never from headers/body
- Every D1 query includes `WHERE tenant_id = ?`
- RBAC roles: `SUPER_ADMIN`, `TENANT_ADMIN`, `PRODUCTION_MANAGER`, `FLOOR_SUPERVISOR`, `QC_INSPECTOR`, `VIEWER`
- JWT secret set via `wrangler secret put JWT_SECRET` (not in wrangler.toml)
