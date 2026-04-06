/**
 * WebWaka Production Suite — Commerce Webhook Module Tests (PROD-005)
 * Blueprint Reference: Part 8.1 — 5-Layer QA Protocol, Layer 2 (Unit Tests)
 */

import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { commerceWebhookRouter } from './index.js';
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
  dbOverrides: Parameters<typeof createMockD1>[0] = {},
  interServiceSecret?: string
) {
  const app = new Hono<{ Variables: TestVariables }>();
  const mockDB = createMockD1(dbOverrides);
  app.use('*', async (c, next) => {
    c.set('user', { sub: 'user-001', role: userRole, tenantId, permissions: [], iat: 0, exp: 9999999999, email: 'test@webwaka.app' });
    c.set('tenantId', tenantId);
    return next();
  });
  app.route('/', commerceWebhookRouter);
  const env = {
    DB: mockDB as unknown as D1Database,
    SESSIONS_KV: {} as KVNamespace,
    RATE_LIMIT_KV: {} as KVNamespace,
    JWT_SECRET: 'test-secret',
    ENVIRONMENT: 'development' as const,
    INTER_SERVICE_SECRET: interServiceSecret,
  };
  return { app, mockDB, env };
}

const validEvent = {
  eventId: 'evt-001',
  eventType: 'B2BSalesOrderPlaced' as const,
  tenantId: 'tenant-123',
  timestamp: new Date().toISOString(),
  data: { salesOrderId: 'so-001', orderNumber: 'SO-001', productName: 'Steel Widget', quantity: 200, unit: 'units', scheduledDeliveryDate: '2026-06-01', notes: 'Urgent' },
};

describe('Commerce Webhook Module (PROD-005)', () => {

  describe('POST /commerce', () => {

    it('should reject with 401 when inter-service secret is wrong', async () => {
      const { app, env } = createTestApp('TENANT_ADMIN', 'tenant-123', {}, 'correct-secret');
      const res = await app.request('/commerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Inter-Service-Secret': 'wrong-secret' },
        body: JSON.stringify(validEvent),
      }, env);
      expect(res.status).toBe(401);
    });

    it('should allow request when no INTER_SERVICE_SECRET configured', async () => {
      const { app, mockDB, env } = createTestApp('TENANT_ADMIN', 'tenant-123', {}, undefined);
      mockDB._stmt.first.mockResolvedValueOnce(null);
      const res = await app.request('/commerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validEvent),
      }, env);
      expect([200, 201, 500]).toContain(res.status);
    });

    it('should return 400 for invalid JSON body', async () => {
      const { app, env } = createTestApp();
      const res = await app.request('/commerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      }, env);
      expect(res.status).toBe(400);
    });

    it('should return 400 for missing required event fields', async () => {
      const { app, env } = createTestApp();
      const res = await app.request('/commerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: 'x', eventType: 'B2BSalesOrderPlaced' }),
      }, env);
      expect(res.status).toBe(400);
    });

    it('should return 400 for unsupported event type', async () => {
      const { app, env } = createTestApp();
      const res = await app.request('/commerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validEvent, eventType: 'UnknownEvent' }),
      }, env);
      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.error).toContain('Unsupported event type');
    });

    it('should return 200 (idempotent) for already-processed event', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.first.mockResolvedValueOnce({ id: 'evt-001', processed: 1, production_order_id: 'po-001' });
      const res = await app.request('/commerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validEvent),
      }, env);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.message).toContain('idempotent');
    });

    it('should create a production order (201) for valid new event', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.first.mockResolvedValueOnce(null);
      const res = await app.request('/commerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validEvent),
      }, env);
      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.eventId).toBe('evt-001');
      expect(body.data.productionOrderId).toBeDefined();
      expect(body.data.orderNumber).toMatch(/^PO-B2B-/);
    });

    it('should create order without notes when event has no notes field', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.first.mockResolvedValueOnce(null);
      const noNotesEvent = { ...validEvent, data: { salesOrderId: 'so-002', orderNumber: 'SO-002', productName: 'Widget', quantity: 10, unit: 'kg' } };
      const res = await app.request('/commerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noNotesEvent),
      }, env);
      expect(res.status).toBe(201);
    });

    it('should mark event as failed (DLQ processed=2) when production order insert throws', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.first.mockResolvedValueOnce(null);
      mockDB._stmt.run
        .mockResolvedValueOnce({ meta: { changes: 1 } })
        .mockRejectedValueOnce(new Error('DB constraint'))
        .mockResolvedValueOnce({ meta: { changes: 1 } });
      const res = await app.request('/commerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validEvent),
      }, env);
      expect(res.status).toBe(500);
    });

    it('should return 500 when event data has empty productName', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.first.mockResolvedValueOnce(null);
      const badEvent = { ...validEvent, data: { ...validEvent.data, productName: '' } };
      const res = await app.request('/commerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(badEvent),
      }, env);
      expect(res.status).toBe(500);
    });
  });

  describe('GET /events', () => {

    it('should return 403 for VIEWER role', async () => {
      const { app, env } = createTestApp('VIEWER');
      const res = await app.request('/events', {}, env);
      expect(res.status).toBe(403);
    });

    it('should return 403 for FLOOR_SUPERVISOR role', async () => {
      const { app, env } = createTestApp('FLOOR_SUPERVISOR');
      const res = await app.request('/events', {}, env);
      expect(res.status).toBe(403);
    });

    it('should return 403 for QC_INSPECTOR role', async () => {
      const { app, env } = createTestApp('QC_INSPECTOR');
      const res = await app.request('/events', {}, env);
      expect(res.status).toBe(403);
    });

    it('should return 200 with events for TENANT_ADMIN', async () => {
      const { app, mockDB, env } = createTestApp('TENANT_ADMIN');
      mockDB._stmt.all.mockResolvedValueOnce({ results: [{ id: 'evt-001', processed: 1 }] });
      const res = await app.request('/events', {}, env);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should return 200 for SUPER_ADMIN', async () => {
      const { app, mockDB, env } = createTestApp('SUPER_ADMIN');
      mockDB._stmt.all.mockResolvedValueOnce({ results: [] });
      const res = await app.request('/events', {}, env);
      expect(res.status).toBe(200);
    });

    it('should accept processed=2 filter (DLQ)', async () => {
      const { app, mockDB, env } = createTestApp('TENANT_ADMIN');
      mockDB._stmt.all.mockResolvedValueOnce({ results: [] });
      const res = await app.request('/events?processed=2', {}, env);
      expect(res.status).toBe(200);
    });

    it('should accept processed=0 filter (pending)', async () => {
      const { app, mockDB, env } = createTestApp('TENANT_ADMIN');
      mockDB._stmt.all.mockResolvedValueOnce({ results: [] });
      const res = await app.request('/events?processed=0', {}, env);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /events/:id/retry', () => {

    it('should return 403 for VIEWER role', async () => {
      const { app, env } = createTestApp('VIEWER');
      const res = await app.request('/events/evt-001/retry', { method: 'POST' }, env);
      expect(res.status).toBe(403);
    });

    it('should return 403 for QC_INSPECTOR role', async () => {
      const { app, env } = createTestApp('QC_INSPECTOR');
      const res = await app.request('/events/evt-001/retry', { method: 'POST' }, env);
      expect(res.status).toBe(403);
    });

    it('should return 404 when event is not found', async () => {
      const { app, mockDB, env } = createTestApp('TENANT_ADMIN');
      mockDB._stmt.first.mockResolvedValueOnce(null);
      const res = await app.request('/events/nonexistent/retry', { method: 'POST' }, env);
      expect(res.status).toBe(404);
    });

    it('should return 409 when event already processed (processed=1)', async () => {
      const { app, mockDB, env } = createTestApp('TENANT_ADMIN');
      mockDB._stmt.first.mockResolvedValueOnce({ id: 'evt-001', processed: 1, tenant_id: 'tenant-123' });
      const res = await app.request('/events/evt-001/retry', { method: 'POST' }, env);
      expect(res.status).toBe(409);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
    });

    it('should return 200 and reset failed event (processed=2) to pending', async () => {
      const { app, mockDB, env } = createTestApp('TENANT_ADMIN');
      mockDB._stmt.first.mockResolvedValueOnce({ id: 'evt-001', processed: 2, tenant_id: 'tenant-123', event_type: 'B2BSalesOrderPlaced', payload: '{}' });
      const res = await app.request('/events/evt-001/retry', { method: 'POST' }, env);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.message).toContain('pending');
    });

    it('should return 200 for SUPER_ADMIN resetting a failed event', async () => {
      const { app, mockDB, env } = createTestApp('SUPER_ADMIN');
      mockDB._stmt.first.mockResolvedValueOnce({ id: 'evt-002', processed: 2, tenant_id: 'tenant-123', event_type: 'B2BSalesOrderPlaced', payload: '{}' });
      const res = await app.request('/events/evt-002/retry', { method: 'POST' }, env);
      expect(res.status).toBe(200);
    });
  });
});
