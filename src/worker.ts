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
 */

import { Hono } from 'hono';
import {
  jwtAuthMiddleware,
  secureCORS,
  rateLimit,
  type JWTPayload,
} from '@webwaka/core';
import { productionMgmtRouter } from './modules/production-mgmt/index.js';

// ─── Cloudflare Workers Bindings Type ─────────────────────────────────────────
export interface Bindings {
  DB: D1Database;
  SESSIONS_KV: KVNamespace;
  RATE_LIMIT_KV: KVNamespace;
  JWT_SECRET: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
}

// ─── Hono Context Variables ───────────────────────────────────────────────────
interface Variables {
  user: JWTPayload;
  tenantId: string;
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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
    environment: c.env.ENVIRONMENT,
  });
  return corsMiddleware(c, next);
});

// ─── Global Rate Limiting on Auth Endpoints ───────────────────────────────────
app.use('/api/*/auth/*', async (c, next) => {
  const rateLimitMiddleware = rateLimit({
    kvNamespace: c.env.RATE_LIMIT_KV,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    keyPrefix: 'prod:auth',
  });
  return rateLimitMiddleware(c, next);
});

// ─── Global JWT Auth Middleware ───────────────────────────────────────────────
// tenantId is ALWAYS sourced from the validated JWT payload — NEVER from headers
// Blueprint Reference: Part 6.1 — Multi-Tenant Security Model
app.use('/api/*', async (c, next) => {
  const authMiddleware = jwtAuthMiddleware({
    secret: c.env.JWT_SECRET,
    kvNamespace: c.env.SESSIONS_KV,
    publicRoutes: [
      '/api/production/public',
    ],
  });
  return authMiddleware(c, next);
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
// PROD-1: Production Management (orders, BOM, quality control)
// Blueprint Reference: Part 10.x — Production Vertical
app.route('/api/production/mgmt', productionMgmtRouter);

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
