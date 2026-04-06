/**
 * WebWaka Production Suite — External API Module Tests (PROD-007)
 * Blueprint Reference: Part 8.1 — 5-Layer QA Protocol, Layer 2 (Unit Tests)
 */

import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { externalApiRouter } from './index.js';
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

const VALID_API_KEY = 'test-api-key-valid';
const VALID_TENANT_ID = 'tenant-ext-001';

function createMockKV(apiKeyData?: { tenantId: string; permissions: string[]; expiresAt?: string } | null) {
  return {
    get: vi.fn().mockResolvedValue(apiKeyData !== undefined ? apiKeyData : {
      tenantId: VALID_TENANT_ID,
      permissions: ['production:read', 'production:write'],
    }),
    put: vi.fn(),
    delete: vi.fn(),
  } as unknown as KVNamespace;
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
  dbOverrides: Parameters<typeof createMockD1>[0] = {},
  kvData?: Parameters<typeof createMockKV>[0]
) {
  const app = new Hono<{ Variables: TestVariables }>();
  const mockDB = createMockD1(dbOverrides);
  const mockKV = createMockKV(kvData);

  app.route('/', externalApiRouter);

  const env = {
    DB: mockDB as unknown as D1Database,
    SESSIONS_KV: mockKV,
    RATE_LIMIT_KV: {} as KVNamespace,
    JWT_SECRET: 'test-secret',
    ENVIRONMENT: 'development' as const,
  };
  return { app, mockDB, mockKV, env };
}

const sampleOrder = {
  id: 'order-001',
  tenant_id: VALID_TENANT_ID,
  order_number: 'PO-EXT-001',
  product_name: 'Steel Widget',
  quantity: 100,
  unit: 'units',
  status: 'DRAFT',
  scheduled_start_date: null,
  scheduled_end_date: null,
  actual_start_date: null,
  actual_end_date: null,
  notes: null,
  created_by: 'external-api',
  created_at: '2026-04-01T00:00:00.000Z',
  updated_at: '2026-04-01T00:00:00.000Z',
};

describe('External API Module (PROD-007)', () => {

  describe('API Key Authentication Middleware', () => {

    it('should return 401 when X-Api-Key header is missing', async () => {
      const { app, env } = createTestApp();
      const res = await app.request('/orders', {}, env);
      expect(res.status).toBe(401);
      const body = await res.json() as any;
      expect(body.error).toContain('X-Api-Key');
    });

    it('should return 401 when API key is not found in KV', async () => {
      const { app, env } = createTestApp({}, null);
      const res = await app.request('/orders', {
        headers: { 'X-Api-Key': 'invalid-key' },
      }, env);
      expect(res.status).toBe(401);
      const body = await res.json() as any;
      expect(body.error).toContain('Invalid or expired');
    });

    it('should return 401 when API key is expired', async () => {
      const { app, env } = createTestApp({}, {
        tenantId: VALID_TENANT_ID,
        permissions: [],
        expiresAt: '2020-01-01T00:00:00.000Z', // past date
      });
      const res = await app.request('/orders', {
        headers: { 'X-Api-Key': VALID_API_KEY },
      }, env);
      expect(res.status).toBe(401);
    });

    it('should pass through with valid API key', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.all.mockResolvedValueOnce({ results: [] });
      const res = await app.request('/orders', {
        headers: { 'X-Api-Key': VALID_API_KEY },
      }, env);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /orders', () => {

    it('should return 200 with empty list', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.all.mockResolvedValueOnce({ results: [] });
      const res = await app.request('/orders', { headers: { 'X-Api-Key': VALID_API_KEY } }, env);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toBeDefined();
      expect(body.meta.hasMore).toBe(false);
    });

    it('should return 200 with orders and meta', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.all.mockResolvedValueOnce({ results: [sampleOrder] });
      const res = await app.request('/orders', { headers: { 'X-Api-Key': VALID_API_KEY } }, env);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.data.length).toBe(1);
      expect(body.meta.count).toBe(1);
    });

    it('should support status query filter', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.all.mockResolvedValueOnce({ results: [] });
      const res = await app.request('/orders?status=DRAFT', { headers: { 'X-Api-Key': VALID_API_KEY } }, env);
      expect(res.status).toBe(200);
    });

    it('should support cursor-based pagination', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.all.mockResolvedValueOnce({ results: [] });
      const res = await app.request('/orders?cursor=2026-01-01T00:00:00.000Z', { headers: { 'X-Api-Key': VALID_API_KEY } }, env);
      expect(res.status).toBe(200);
    });

    it('should support combined status+cursor filter', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.all.mockResolvedValueOnce({ results: [] });
      const res = await app.request('/orders?status=DRAFT&cursor=2026-01-01T00:00:00.000Z', { headers: { 'X-Api-Key': VALID_API_KEY } }, env);
      expect(res.status).toBe(200);
    });

    it('should support limit query param', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.all.mockResolvedValueOnce({ results: [] });
      const res = await app.request('/orders?limit=5', { headers: { 'X-Api-Key': VALID_API_KEY } }, env);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.meta.limit).toBe(5);
    });

    it('should set hasMore=true when results equal the limit', async () => {
      const { app, mockDB, env } = createTestApp();
      // Return exactly limit=1 results with created_at for cursor
      const results = [{ ...sampleOrder, created_at: '2026-03-01T00:00:00.000Z' }];
      mockDB._stmt.all.mockResolvedValueOnce({ results });
      const res = await app.request('/orders?limit=1', { headers: { 'X-Api-Key': VALID_API_KEY } }, env);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.meta.hasMore).toBe(true);
      expect(body.meta.nextCursor).toBe('2026-03-01T00:00:00.000Z');
    });
  });

  describe('GET /orders/:id', () => {

    it('should return 401 without API key', async () => {
      const { app, env } = createTestApp();
      const res = await app.request('/orders/order-001', {}, env);
      expect(res.status).toBe(401);
    });

    it('should return 404 when order not found', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.first.mockResolvedValueOnce(null);
      mockDB._stmt.all.mockResolvedValue({ results: [] });
      const res = await app.request('/orders/nonexistent', { headers: { 'X-Api-Key': VALID_API_KEY } }, env);
      expect(res.status).toBe(404);
    });

    it('should return 200 with hydrated order including BOM, QC, and tasks', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.first.mockResolvedValueOnce(sampleOrder);
      mockDB._stmt.all
        .mockResolvedValueOnce({ results: [{ id: 'bom-001', component_name: 'Steel Rod' }] })
        .mockResolvedValueOnce({ results: [{ id: 'qc-001', result: 'PASS' }] })
        .mockResolvedValueOnce({ results: [{ id: 'task-001', task_name: 'Assemble' }] });
      const res = await app.request('/orders/order-001', { headers: { 'X-Api-Key': VALID_API_KEY } }, env);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('order-001');
      expect(Array.isArray(body.data.billOfMaterials)).toBe(true);
      expect(Array.isArray(body.data.qualityChecks)).toBe(true);
      expect(Array.isArray(body.data.tasks)).toBe(true);
    });
  });

  describe('POST /orders', () => {

    it('should return 401 without API key', async () => {
      const { app, env } = createTestApp();
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: 'Widget', quantity: 10, unit: 'units' }),
      }, env);
      expect(res.status).toBe(401);
    });

    it('should return 400 when required fields are missing', async () => {
      const { app, env } = createTestApp();
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': VALID_API_KEY },
        body: JSON.stringify({ productName: 'Widget' }), // missing quantity and unit
      }, env);
      expect(res.status).toBe(400);
    });

    it('should return 400 for non-positive quantity', async () => {
      const { app, env } = createTestApp();
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': VALID_API_KEY },
        body: JSON.stringify({ productName: 'Widget', quantity: 0, unit: 'units' }),
      }, env);
      expect(res.status).toBe(400);
    });

    it('should return 201 with new order for valid request', async () => {
      const { app, env } = createTestApp();
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': VALID_API_KEY },
        body: JSON.stringify({ productName: 'Steel Widget', quantity: 50, unit: 'kg' }),
      }, env);
      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.orderNumber).toMatch(/^PO-EXT-/);
      expect(body.data.status).toBe('DRAFT');
      expect(body.data.externalReference).toBeNull();
    });

    it('should include externalReference in notes when provided', async () => {
      const { app, env } = createTestApp();
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': VALID_API_KEY },
        body: JSON.stringify({ productName: 'Widget', quantity: 10, unit: 'kg', externalReference: 'ERP-12345', notes: 'Rush order' }),
      }, env);
      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.data.externalReference).toBe('ERP-12345');
    });

    it('should create order with optional date fields', async () => {
      const { app, env } = createTestApp();
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': VALID_API_KEY },
        body: JSON.stringify({ productName: 'Widget', quantity: 5, unit: 'units', scheduledStartDate: '2026-05-01', scheduledEndDate: '2026-05-15' }),
      }, env);
      expect(res.status).toBe(201);
    });
  });

  describe('PUT /orders/:id/status', () => {

    it('should return 401 without API key', async () => {
      const { app, env } = createTestApp();
      const res = await app.request('/orders/order-001/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      }, env);
      expect(res.status).toBe(401);
    });

    it('should return 400 when status field is missing', async () => {
      const { app, env } = createTestApp();
      const res = await app.request('/orders/order-001/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': VALID_API_KEY },
        body: JSON.stringify({}),
      }, env);
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid status value', async () => {
      const { app, env } = createTestApp();
      const res = await app.request('/orders/order-001/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': VALID_API_KEY },
        body: JSON.stringify({ status: 'INVALID_STATUS' }),
      }, env);
      expect(res.status).toBe(400);
    });

    it('should return 404 when order not found', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.first.mockResolvedValueOnce(null);
      const res = await app.request('/orders/nonexistent/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': VALID_API_KEY },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      }, env);
      expect(res.status).toBe(404);
    });

    it('should return 422 for invalid status transition', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.first.mockResolvedValueOnce({ status: 'COMPLETED' });
      const res = await app.request('/orders/order-001/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': VALID_API_KEY },
        body: JSON.stringify({ status: 'IN_PROGRESS' }), // COMPLETED → IN_PROGRESS is invalid
      }, env);
      expect(res.status).toBe(422);
      const body = await res.json() as any;
      expect(body.error).toContain('Invalid status transition');
    });

    it('should return 200 for valid DRAFT → IN_PROGRESS transition', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.first.mockResolvedValueOnce({ status: 'DRAFT' });
      const res = await app.request('/orders/order-001/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': VALID_API_KEY },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      }, env);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('IN_PROGRESS');
    });

    it('should return 200 for valid IN_PROGRESS → COMPLETED transition', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.first.mockResolvedValueOnce({ status: 'IN_PROGRESS' });
      const res = await app.request('/orders/order-001/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': VALID_API_KEY },
        body: JSON.stringify({ status: 'COMPLETED' }),
      }, env);
      expect(res.status).toBe(200);
    });

    it('should return 200 for valid DRAFT → CANCELLED transition', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.first.mockResolvedValueOnce({ status: 'DRAFT' });
      const res = await app.request('/orders/order-001/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': VALID_API_KEY },
        body: JSON.stringify({ status: 'CANCELLED' }),
      }, env);
      expect(res.status).toBe(200);
    });

    it('should return 200 when setting same status (no-op transition)', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.first.mockResolvedValueOnce({ status: 'DRAFT' });
      const res = await app.request('/orders/order-001/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': VALID_API_KEY },
        body: JSON.stringify({ status: 'DRAFT' }), // same status = valid no-op
      }, env);
      expect(res.status).toBe(200);
    });

    it('should return 422 for CANCELLED → IN_PROGRESS transition', async () => {
      const { app, mockDB, env } = createTestApp();
      mockDB._stmt.first.mockResolvedValueOnce({ status: 'CANCELLED' });
      const res = await app.request('/orders/order-001/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': VALID_API_KEY },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      }, env);
      expect(res.status).toBe(422);
    });
  });
});
