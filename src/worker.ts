/**
 * WebWaka Production Suite — Cloudflare Worker Entry Point
 * Blueprint Reference: Part 3.2 — Cloudflare Workers Runtime
 *
 * Invariant 1: Build Once Use Infinitely — auth/CORS imported from @webwaka/core
 * Invariant 5: Nigeria First — Paystack kobo integration ready
 * Invariant 7: Vendor Neutral AI — OpenRouter abstraction only
 *
 * Security Mandates (enforced here at the global level):
 * - secureCORS: NO wildcard origin, environment-aware allowlist
 * - jwtAuthMiddleware: ALL /api/* routes protected, tenantId from JWT only
 * - rateLimit: Applied to all auth and mutation endpoints
 *
 * Route Prefixes:
 * - /health               — public health check
 * - /api/production/mgmt  — internal production management (JWT auth)
 * - /api/production/webhooks — commerce webhooks (/commerce is public, rest is JWT)
 * - /api/production/retention — data retention (JWT auth)
 * - /ext/v1/production    — external ERP/MES API (API key auth, NOT JWT)
 */

import { Hono } from 'hono';
import {
  jwtAuthMiddleware,
  secureCORS,
  rateLimit,
  type JWTPayload,
  type WakaUser,
} from '@webwaka/core';
import { productionMgmtRouter } from './modules/production-mgmt/index.js';
import { commerceWebhookRouter } from './modules/commerce-webhook/index.js';
import { dataRetentionRouter } from './modules/data-retention/index.js';
import { externalApiRouter } from './modules/external-api/index.js';

// ─── Cloudflare Workers Bindings Type ─────────────────────────────────────────
export interface Bindings {
  DB: D1Database;
  SESSIONS_KV: KVNamespace;
  RATE_LIMIT_KV: KVNamespace;
  JWT_SECRET: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  INTER_SERVICE_SECRET?: string;
  PAYSTACK_SECRET_KEY?: string;
  OPENROUTER_API_KEY?: string;
}

// ─── Hono Context Variables ───────────────────────────────────────────────────
interface Variables {
  user: JWTPayload;
  tenantId: string;
}

// AppVariables for typed c.get('user') — required by @webwaka/core v1.3.0
export interface AppVariables {
  user: WakaUser | undefined;
  tenantId?: string;
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables & AppVariables }>();

// ─── Global CORS Middleware (Invariant 1: Build Once Use Infinitely) ──────────
// NEVER use origin: '*' — secureCORS enforces environment-aware allowlist
app.use('*', async (c, next) => {
  const corsMiddleware = secureCORS({
    allowedOrigins: [
      'https://*.webwaka.app',
      'https://*.webwaka.workers.dev',
      'http://localhost:5000',
      'http://localhost:5173',
    ],
  });
  return corsMiddleware(c as any, next);
});

// ─── Global Rate Limiting on Auth Endpoints ───────────────────────────────────
app.use('/api/*/auth/*', async (c, next) => {
  const rateLimitMiddleware = rateLimit({
    limit: 20,
    windowSeconds: 15 * 60, // 15 minutes
    keyPrefix: 'prod:auth',
  });
  return rateLimitMiddleware(c as any, next);
});

// ─── Global JWT Auth Middleware ───────────────────────────────────────────────
// tenantId is ALWAYS sourced from the validated JWT payload — NEVER from headers
// Blueprint Reference: Part 6.1 — Multi-Tenant Security Model
//
// Public routes:
// - /api/production/public       — legacy public route
// - /api/production/webhooks/commerce — inter-service webhook (uses X-Inter-Service-Secret)
app.use('/api/*', async (c, next) => {
  const authMiddleware = jwtAuthMiddleware({
    publicRoutes: [
      { path: '/api/production/public' },
      { path: '/api/production/webhooks/commerce' },
    ],
  });
  return authMiddleware(c as any, next);
});

// ─── Health Check (public — no auth required) ─────────────────────────────────
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    vertical: 'production',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
  });
});

// ─── Module Routes ────────────────────────────────────────────────────────────

// PROD-1/2/3/4: Production Management (orders, BOM, quality control, tasks)
app.route('/api/production/mgmt', productionMgmtRouter);

// PROD-5: Commerce Webhook — B2B sales order events from webwaka-commerce
// POST /api/production/webhooks/commerce   — public (inter-service secret)
// GET  /api/production/webhooks/events     — JWT protected (TENANT_ADMIN)
// POST /api/production/webhooks/events/:id/retry — JWT protected (TENANT_ADMIN)
app.route('/api/production/webhooks', commerceWebhookRouter);

// PROD-6: Data Retention — archiving and audit of historical records
app.route('/api/production/retention', dataRetentionRouter);

// PROD-7: External ERP/MES API — API key authenticated, NOT under /api/* (no JWT middleware)
// Routes: /ext/v1/production/orders, /ext/v1/production/orders/:id, etc.
app.route('/ext/v1/production', externalApiRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.notFound((c) => {
  return c.json({ error: 'Not found', path: c.req.path }, 404);
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error(`[${c.env.ENVIRONMENT}] Unhandled error:`, err.message);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
