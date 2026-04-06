/**
 * WebWaka Production Suite — Data Retention Module Tests (PROD-006)
 * Blueprint Reference: Part 8.1 — 5-Layer QA Protocol, Layer 2 (Unit Tests)
 */

import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { dataRetentionRouter } from './index.js';
import type { JWTPayload } from '@webwaka/core';

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

interface TestVariables {
  user: JWTPayload & { role: string; tenantId: string };
  tenantId: string;
}

function createMockD1(overrides: { firstResult?: unknown; allResult?: { results: unknown[] } } = {}) {
  const stmt = {
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue(overrides.allResult ?? { results: [] }),
    first: vi.fn().mockResolvedValue(overrides.firstResult ?? null),
    run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
  };
  return { prepare: vi.fn().mockReturnValue(stmt), _stmt: stmt };
}

function createTestApp(
  userRole = 'TENANT_ADMIN',
  tenantId = 'tenant-123',
  dbOverrides: Parameters<typeof createMockD1>[0] = {}
) {
  const app = new Hono<{ Variables: TestVariables }>();
  const mockDB = createMockD1(dbOverrides);
  app.use('*', async (c, next) => {
    c.set('user', { sub: 'user-001', role: userRole, tenantId, permissions: [], iat: 0, exp: 9999999999, email: 'test@webwaka.app' });
    c.set('tenantId', tenantId);
    return next();
  });
  app.route('/', dataRetentionRouter);
  const env = {
    DB: mockDB as unknown as D1Database,
    SESSIONS_KV: {} as KVNamespace,
    RATE_LIMIT_KV: {} as KVNamespace,
    JWT_SECRET: 'test-secret',
    ENVIRONMENT: 'development' as const,
  };
  return { app, mockDB, env };
}

const oldOrder = {
  id: 'order-old-001',
  tenant_id: 'tenant-123',
  order_number: 'PO-OLD-001',
  product_name: 'Widget',
  quantity: 100,
  unit: 'units',
  status: 'COMPLETED',
  scheduled_start_date: null,
  scheduled_end_date: null,
  actual_start_date: null,
  actual_end_date: null,
  notes: null,
  created_by: 'user-001',
  created_at: '2022-01-01T00:00:00.000Z',
  updated_at: '2022-01-01T00:00:00.000Z',
};

describe('Data Retention Module (PROD-006)', () => {

  describe('POST /archive', () => {

    it('should return 403 for VIEWER role', async () => {
      const { app, env } = createTestApp('VIEWER');
      const res = await app.request('/archive', { method: 'POST' }, env);
      expect(res.status).toBe(403);
    });

    it('should return 403 for FLOOR_SUPERVISOR role', async () => {
      const { app, env } = createTestApp('FLOOR_SUPERVISOR');
      const res = await app.request('/archive', { method: 'POST' }, env);
      expect(res.status).toBe(403);
    });

    it('should return 403 for PRODUCTION_MANAGER role', async () => {
      const { app, env } = createTestApp('PRODUCTION_MANAGER');
      const res = await app.request('/archive', { method: 'POST' }, env);
      expect(res.status).toBe(403);
    });

    it('should return 200 with zero archived when no eligible orders', async () => {
      const { app, mockDB, env } = createTestApp('TENANT_ADMIN');
      mockDB._stmt.all.mockResolvedValueOnce({ results: [] });
      const res = await app.request('/archive', { method: 'POST' }, env);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.archived).toBe(0);
    });

    it('should archive eligible completed orders and report correct count', async () => {
      const { app, mockDB, env } = createTestApp('TENANT_ADMIN');
      mockDB._stmt.all.mockResolvedValueOnce({ results: [oldOrder] });
      const res = await app.request('/archive', { method: 'POST' }, env);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.archived).toBe(1);
    });

    it('should archive multiple orders and report total count', async () => {
      const { app, mockDB, env } = createTestApp('SUPER_ADMIN');
      const orders = [
        { ...oldOrder, id: 'o1' },
        { ...oldOrder, id: 'o2', status: 'CANCELLED' },
      ];
      mockDB._stmt.all.mockResolvedValueOnce({ results: orders });
      const res = await app.request('/archive', { method: 'POST' }, env);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.data.archived).toBe(2);
    });

    it('should skip and continue when one order archive insert fails', async () => {
      const { app, mockDB, env } = createTestApp('TENANT_ADMIN');
      const orders = [{ ...oldOrder, id: 'o1' }, { ...oldOrder, id: 'o2' }];
      mockDB._stmt.all.mockResolvedValueOnce({ results: orders });
      mockDB._stmt.run
        .mockResolvedValueOnce({ meta: { changes: 1 } }) // archive o1 OK
        .mockResolvedValueOnce({ meta: { changes: 1 } }) // delete o1 OK
        .mockRejectedValueOnce(new Error('Constraint'))   // archive o2 FAIL
        .mockResolvedValueOnce({ meta: { changes: 1 } }); // unused
      const res = await app.request('/archive', { method: 'POST' }, env);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.data.archived).toBe(1);
    });

    it('should return 200 for SUPER_ADMIN with no eligible orders', async () => {
      const { app, mockDB, env } = createTestApp('SUPER_ADMIN');
      mockDB._stmt.all.mockResolvedValueOnce({ results: [] });
      const res = await app.request('/archive', { method: 'POST' }, env);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /archived', () => {

    it('should return 403 for VIEWER role', async () => {
      const { app, env } = createTestApp('VIEWER');
      const res = await app.request('/archived', {}, env);
      expect(res.status).toBe(403);
    });

    it('should return 403 for QC_INSPECTOR role', async () => {
      const { app, env } = createTestApp('QC_INSPECTOR');
      const res = await app.request('/archived', {}, env);
      expect(res.status).toBe(403);
    });

    it('should return 403 for PRODUCTION_MANAGER role', async () => {
      const { app, env } = createTestApp('PRODUCTION_MANAGER');
      const res = await app.request('/archived', {}, env);
      expect(res.status).toBe(403);
    });

    it('should return 200 with archived orders and pagination for TENANT_ADMIN', async () => {
      const { app, mockDB, env } = createTestApp('TENANT_ADMIN');
      mockDB._stmt.all.mockResolvedValueOnce({ results: [{ ...oldOrder, archived_at: '2026-01-01T00:00:00.000Z' }] });
      mockDB._stmt.first.mockResolvedValueOnce({ total: 1 });
      const res = await app.request('/archived', {}, env);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeDefined();
    });

    it('should return 200 with empty list for TENANT_ADMIN when no archived orders', async () => {
      const { app, mockDB, env } = createTestApp('TENANT_ADMIN');
      mockDB._stmt.all.mockResolvedValueOnce({ results: [] });
      mockDB._stmt.first.mockResolvedValueOnce({ total: 0 });
      const res = await app.request('/archived', {}, env);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.data).toHaveLength(0);
    });

    it('should return 200 for SUPER_ADMIN', async () => {
      const { app, mockDB, env } = createTestApp('SUPER_ADMIN');
      mockDB._stmt.all.mockResolvedValueOnce({ results: [] });
      mockDB._stmt.first.mockResolvedValueOnce({ total: 0 });
      const res = await app.request('/archived', {}, env);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /archived/:id', () => {

    it('should return 403 for VIEWER role', async () => {
      const { app, env } = createTestApp('VIEWER');
      const res = await app.request('/archived/order-old-001', {}, env);
      expect(res.status).toBe(403);
    });

    it('should return 403 for FLOOR_SUPERVISOR role', async () => {
      const { app, env } = createTestApp('FLOOR_SUPERVISOR');
      const res = await app.request('/archived/order-old-001', {}, env);
      expect(res.status).toBe(403);
    });

    it('should return 404 when archived order not found', async () => {
      const { app, mockDB, env } = createTestApp('TENANT_ADMIN');
      mockDB._stmt.first.mockResolvedValueOnce(null);
      const res = await app.request('/archived/nonexistent', {}, env);
      expect(res.status).toBe(404);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
    });

    it('should return 200 with the archived order for TENANT_ADMIN', async () => {
      const { app, mockDB, env } = createTestApp('TENANT_ADMIN');
      mockDB._stmt.first.mockResolvedValueOnce({ ...oldOrder, archived_at: '2026-01-01T00:00:00.000Z' });
      const res = await app.request('/archived/order-old-001', {}, env);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('order-old-001');
    });

    it('should return 200 for SUPER_ADMIN', async () => {
      const { app, mockDB, env } = createTestApp('SUPER_ADMIN');
      mockDB._stmt.first.mockResolvedValueOnce({ ...oldOrder, archived_at: '2026-01-01T00:00:00.000Z' });
      const res = await app.request('/archived/order-old-001', {}, env);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /stats', () => {

    it('should return 403 for VIEWER role', async () => {
      const { app, env } = createTestApp('VIEWER');
      const res = await app.request('/stats', {}, env);
      expect(res.status).toBe(403);
    });

    it('should return 403 for PRODUCTION_MANAGER role', async () => {
      const { app, env } = createTestApp('PRODUCTION_MANAGER');
      const res = await app.request('/stats', {}, env);
      expect(res.status).toBe(403);
    });

    it('should return 200 with stats for TENANT_ADMIN', async () => {
      const { app, mockDB, env } = createTestApp('TENANT_ADMIN');
      mockDB._stmt.first
        .mockResolvedValueOnce({ total: 50 })  // active orders
        .mockResolvedValueOnce({ total: 10 })  // archived orders
        .mockResolvedValueOnce({ total: 5 });  // eligible for archiving
      const res = await app.request('/stats', {}, env);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.activeOrders).toBe(50);
      expect(body.data.archivedOrders).toBe(10);
      expect(body.data.eligibleForArchiving).toBe(5);
      expect(body.data.retentionWindowDays).toBeDefined();
      expect(body.data.cutoffDate).toBeDefined();
    });

    it('should return 200 with zero stats when DB returns null', async () => {
      const { app, mockDB, env } = createTestApp('TENANT_ADMIN');
      mockDB._stmt.first
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const res = await app.request('/stats', {}, env);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.data.activeOrders).toBe(0);
      expect(body.data.archivedOrders).toBe(0);
      expect(body.data.eligibleForArchiving).toBe(0);
    });

    it('should return 200 for SUPER_ADMIN', async () => {
      const { app, mockDB, env } = createTestApp('SUPER_ADMIN');
      mockDB._stmt.first
        .mockResolvedValueOnce({ total: 0 })
        .mockResolvedValueOnce({ total: 0 })
        .mockResolvedValueOnce({ total: 0 });
      const res = await app.request('/stats', {}, env);
      expect(res.status).toBe(200);
    });
  });
});
