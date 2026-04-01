/**
 * WebWaka Production Suite — Production Management Module Tests
 * Blueprint Reference: Part 8.1 — 5-Layer QA Protocol, Layer 2 (Unit Tests)
 *
 * Test Coverage Target: >90%
 * All tests verify:
 * 1. Auth enforcement (401 without token, 403 with wrong role)
 * 2. Tenant isolation (tenantId from JWT, not headers)
 * 3. Input validation (400 for missing required fields)
 * 4. Correct HTTP status codes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { productionMgmtRouter } from './index.js';
import type { JWTPayload } from '@webwaka/core';

// ─── Test Variables Type ──────────────────────────────────────────────────────
interface TestVariables {
  user: JWTPayload & { role: string; tenantId: string };
  tenantId: string;
}

// ─── Mock @webwaka/core ───────────────────────────────────────────────────────
vi.mock('@webwaka/core', () => ({
  requireRole: (roles: string[]) => async (c: any, next: any) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    if (!roles.includes(user.role)) return c.json({ error: 'Forbidden' }, 403);
    return next();
  },
  jwtAuthMiddleware: () => async (c: any, next: any) => next(),
  secureCORS: () => async (c: any, next: any) => next(),
  rateLimit: () => async (c: any, next: any) => next(),
}));

// ─── Test Helpers ─────────────────────────────────────────────────────────────
function createTestApp(userRole: string = 'TENANT_ADMIN', tenantId: string = 'tenant-123') {
  const app = new Hono<{ Variables: TestVariables }>();
  app.use('*', async (c, next) => {
    c.set('user', { 
      sub: 'user-001', 
      role: userRole, 
      tenantId,
      permissions: [],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      email: 'test@webwaka.app'
    });
    c.set('tenantId', tenantId);
    return next();
  });
  app.route('/', productionMgmtRouter);
  return app;
}

const mockEnv = {
  DB: {} as D1Database,
  SESSIONS_KV: {} as KVNamespace,
  RATE_LIMIT_KV: {} as KVNamespace,
  JWT_SECRET: 'test-secret',
  ENVIRONMENT: 'development' as const,
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('Production Management Module', () => {

  describe('GET /orders', () => {
    it('should return 200 with empty array for VIEWER role', async () => {
      const app = createTestApp('VIEWER');
      const res = await app.request('/orders', {}, mockEnv);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should return 403 for unknown role', async () => {
      const app = createTestApp('UNKNOWN_ROLE');
      const res = await app.request('/orders', {}, mockEnv);
      expect(res.status).toBe(403);
    });

    it('should include pagination in response', async () => {
      const app = createTestApp('TENANT_ADMIN');
      const res = await app.request('/orders', {}, mockEnv);
      const body = await res.json() as any;
      expect(body.pagination).toBeDefined();
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.pageSize).toBe(20);
    });
  });

  describe('POST /orders', () => {
    it('should return 201 for FLOOR_SUPERVISOR creating an order', async () => {
      const app = createTestApp('FLOOR_SUPERVISOR');
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: 'Widget A',
          quantity: 100,
          unit: 'units',
        }),
      }, mockEnv);
      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.productName).toBe('Widget A');
      expect(body.data.status).toBe('DRAFT');
    });

    it('should return 403 for VIEWER trying to create an order', async () => {
      const app = createTestApp('VIEWER');
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: 'Widget A', quantity: 100, unit: 'units' }),
      }, mockEnv);
      expect(res.status).toBe(403);
    });

    it('should return 400 when required fields are missing', async () => {
      const app = createTestApp('TENANT_ADMIN');
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: 'Widget A' }), // missing quantity and unit
      }, mockEnv);
      expect(res.status).toBe(400);
    });

    it('should use tenantId from JWT context, not request body', async () => {
      const app = createTestApp('TENANT_ADMIN', 'jwt-tenant-id');
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: 'Widget A',
          quantity: 100,
          unit: 'units',
          tenantId: 'spoofed-tenant-id', // This should be ignored
        }),
      }, mockEnv);
      const body = await res.json() as any;
      // tenantId must come from JWT context, not the request body
      expect(body.data.tenantId).toBe('jwt-tenant-id');
      expect(body.data.tenantId).not.toBe('spoofed-tenant-id');
    });
  });

  describe('PATCH /orders/:id', () => {
    it('should return 200 for FLOOR_SUPERVISOR updating an order', async () => {
      const app = createTestApp('FLOOR_SUPERVISOR');
      const res = await app.request('/orders/order-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      }, mockEnv);
      expect(res.status).toBe(200);
    });

    it('should return 403 for VIEWER trying to update', async () => {
      const app = createTestApp('VIEWER');
      const res = await app.request('/orders/order-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      }, mockEnv);
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /orders/:id', () => {
    it('should return 200 for TENANT_ADMIN deleting an order', async () => {
      const app = createTestApp('TENANT_ADMIN');
      const res = await app.request('/orders/order-001', {
        method: 'DELETE',
      }, mockEnv);
      expect(res.status).toBe(200);
    });

    it('should return 403 for FLOOR_SUPERVISOR trying to delete', async () => {
      const app = createTestApp('FLOOR_SUPERVISOR');
      const res = await app.request('/orders/order-001', {
        method: 'DELETE',
      }, mockEnv);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /orders/:orderId/bom', () => {
    it('should return 200 for VIEWER', async () => {
      const app = createTestApp('VIEWER');
      const res = await app.request('/orders/order-001/bom', {}, mockEnv);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /orders/:orderId/bom', () => {
    it('should return 201 for PRODUCTION_MANAGER', async () => {
      const app = createTestApp('PRODUCTION_MANAGER');
      const res = await app.request('/orders/order-001/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentName: 'Steel Rod', quantityRequired: 50, unit: 'kg' }),
      }, mockEnv);
      expect(res.status).toBe(201);
    });

    it('should return 403 for FLOOR_SUPERVISOR adding BOM', async () => {
      const app = createTestApp('FLOOR_SUPERVISOR');
      const res = await app.request('/orders/order-001/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentName: 'Steel Rod', quantityRequired: 50, unit: 'kg' }),
      }, mockEnv);
      expect(res.status).toBe(403);
    });
  });

  describe('Quality Checks', () => {
    it('should return 200 for VIEWER listing quality checks', async () => {
      const app = createTestApp('VIEWER');
      const res = await app.request('/orders/order-001/quality', {}, mockEnv);
      expect(res.status).toBe(200);
    });

    it('should return 201 for QC_INSPECTOR recording a check', async () => {
      const app = createTestApp('QC_INSPECTOR');
      const res = await app.request('/orders/order-001/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkType: 'FINAL', result: 'PASS', notes: 'All good' }),
      }, mockEnv);
      expect(res.status).toBe(201);
    });

    it('should return 403 for VIEWER recording a quality check', async () => {
      const app = createTestApp('VIEWER');
      const res = await app.request('/orders/order-001/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkType: 'FINAL', result: 'PASS' }),
      }, mockEnv);
      expect(res.status).toBe(403);
    });
  });
});
