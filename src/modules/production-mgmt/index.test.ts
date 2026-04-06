/**
 * WebWaka Production Suite — Production Management Module Tests
 * Blueprint Reference: Part 8.1 — 5-Layer QA Protocol, Layer 2 (Unit Tests)
 *
 * Test Coverage:
 * 1. Auth enforcement (401 without token, 403 with wrong role)
 * 2. Tenant isolation (tenantId from JWT, not request body)
 * 3. Input validation (400 for missing required fields)
 * 4. Status transition machine (422 for invalid transitions)
 * 5. D1 database interactions (mocked)
 * 6. RBAC for all roles across all routes
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

// ─── D1 Mock Builder ─────────────────────────────────────────────────────────
interface D1MockOptions {
  allResult?: { results: unknown[] };
  firstResult?: unknown;
  runResult?: { meta: { changes: number } };
}

function createMockD1(overrides: D1MockOptions = {}) {
  const stmt = {
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue(overrides.allResult ?? { results: [] }),
    first: vi.fn().mockResolvedValue(overrides.firstResult ?? null),
    run: vi.fn().mockResolvedValue({ meta: { changes: 1 }, ...(overrides.runResult ?? {}) }),
  };
  const db = {
    prepare: vi.fn().mockReturnValue(stmt),
    _stmt: stmt,
  };
  return db;
}

// ─── Test Helpers ─────────────────────────────────────────────────────────────
function createTestApp(
  userRole: string = 'TENANT_ADMIN',
  tenantId: string = 'tenant-123',
  dbOverrides: D1MockOptions = {}
) {
  const app = new Hono<{ Variables: TestVariables }>();
  const mockDB = createMockD1(dbOverrides);

  app.use('*', async (c, next) => {
    c.set('user', {
      sub: 'user-001',
      role: userRole,
      tenantId,
      permissions: [],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      email: 'test@webwaka.app',
    });
    c.set('tenantId', tenantId);
    return next();
  });
  app.route('/', productionMgmtRouter);

  return { app, mockDB };
}

function buildMockEnv(db: ReturnType<typeof createMockD1>) {
  return {
    DB: db as unknown as D1Database,
    SESSIONS_KV: {} as KVNamespace,
    RATE_LIMIT_KV: {} as KVNamespace,
    JWT_SECRET: 'test-secret',
    ENVIRONMENT: 'development' as const,
  };
}

// ─── Sample Data Fixtures ─────────────────────────────────────────────────────
const sampleOrder = {
  id: 'order-001',
  tenant_id: 'tenant-123',
  order_number: 'PO-123456',
  product_name: 'Widget A',
  quantity: 100,
  unit: 'units',
  status: 'DRAFT',
  scheduled_start_date: null,
  scheduled_end_date: null,
  actual_start_date: null,
  actual_end_date: null,
  notes: null,
  created_by: 'user-001',
  created_at: '2026-04-01T00:00:00.000Z',
  updated_at: '2026-04-01T00:00:00.000Z',
};

const sampleBomItem = {
  id: 'bom-001',
  tenant_id: 'tenant-123',
  production_order_id: 'order-001',
  component_name: 'Steel Rod',
  component_sku: 'SKU-001',
  quantity_required: 50,
  unit: 'kg',
  quantity_used: null,
  created_at: '2026-04-01T00:00:00.000Z',
};

const sampleQualityCheck = {
  id: 'qc-001',
  tenant_id: 'tenant-123',
  production_order_id: 'order-001',
  check_type: 'FINAL',
  result: 'PASS',
  checked_by: 'user-001',
  notes: 'All good',
  checked_at: '2026-04-01T00:00:00.000Z',
  created_at: '2026-04-01T00:00:00.000Z',
};

const sampleTask = {
  id: 'task-001',
  tenant_id: 'tenant-123',
  production_order_id: 'order-001',
  task_name: 'Assembly',
  station_id: 'station-A',
  assigned_to: 'user-002',
  status: 'PENDING',
  start_time: null,
  end_time: null,
  notes: null,
  created_by: 'user-001',
  created_at: '2026-04-01T00:00:00.000Z',
  updated_at: '2026-04-01T00:00:00.000Z',
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('Production Management Module', () => {

  // ─── GET /orders ────────────────────────────────────────────────────────────
  describe('GET /orders', () => {
    it('should return 200 with empty array for VIEWER role', async () => {
      const { app, mockDB } = createTestApp('VIEWER', 'tenant-123', {
        allResult: { results: [] },
        firstResult: { total: 0 },
      });
      const res = await app.request('/orders', {}, buildMockEnv(mockDB));
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should return 403 for unknown role', async () => {
      const { app, mockDB } = createTestApp('UNKNOWN_ROLE');
      const res = await app.request('/orders', {}, buildMockEnv(mockDB));
      expect(res.status).toBe(403);
    });

    it('should include pagination in response', async () => {
      const { app, mockDB } = createTestApp('TENANT_ADMIN', 'tenant-123', {
        allResult: { results: [sampleOrder] },
        firstResult: { total: 1 },
      });
      const res = await app.request('/orders', {}, buildMockEnv(mockDB));
      const body = await res.json() as any;
      expect(body.pagination).toBeDefined();
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.pageSize).toBe(20);
      expect(body.pagination.total).toBe(1);
    });

    it('should pass tenantId to DB query', async () => {
      const { app, mockDB } = createTestApp('TENANT_ADMIN', 'my-tenant', {
        allResult: { results: [] },
        firstResult: { total: 0 },
      });
      await app.request('/orders', {}, buildMockEnv(mockDB));
      expect(mockDB._stmt.bind).toHaveBeenCalledWith(
        expect.stringMatching('my-tenant'),
        expect.anything(),
        expect.anything()
      );
    });

    it('should accept status query filter', async () => {
      const { app, mockDB } = createTestApp('PRODUCTION_MANAGER', 'tenant-123', {
        allResult: { results: [] },
        firstResult: { total: 0 },
      });
      const res = await app.request('/orders?status=IN_PROGRESS', {}, buildMockEnv(mockDB));
      expect(res.status).toBe(200);
    });
  });

  // ─── GET /orders/:id ────────────────────────────────────────────────────────
  describe('GET /orders/:id', () => {
    it('should return 200 with order for VIEWER', async () => {
      const { app, mockDB } = createTestApp('VIEWER', 'tenant-123', {
        firstResult: sampleOrder,
      });
      const res = await app.request('/orders/order-001', {}, buildMockEnv(mockDB));
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('order-001');
    });

    it('should return 404 when order not found', async () => {
      const { app, mockDB } = createTestApp('VIEWER', 'tenant-123', {
        firstResult: null,
      });
      const res = await app.request('/orders/nonexistent', {}, buildMockEnv(mockDB));
      expect(res.status).toBe(404);
    });
  });

  // ─── POST /orders ────────────────────────────────────────────────────────────
  describe('POST /orders', () => {
    it('should return 201 for FLOOR_SUPERVISOR creating an order', async () => {
      const { app, mockDB } = createTestApp('FLOOR_SUPERVISOR');
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: 'Widget A', quantity: 100, unit: 'units' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.product_name).toBe('Widget A');
      expect(body.data.status).toBe('DRAFT');
    });

    it('should return 403 for VIEWER trying to create an order', async () => {
      const { app, mockDB } = createTestApp('VIEWER');
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: 'Widget A', quantity: 100, unit: 'units' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(403);
    });

    it('should return 400 when required fields are missing', async () => {
      const { app, mockDB } = createTestApp('TENANT_ADMIN');
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: 'Widget A' }), // missing quantity and unit
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(400);
    });

    it('should return 400 for non-positive quantity', async () => {
      const { app, mockDB } = createTestApp('TENANT_ADMIN');
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: 'Widget A', quantity: -5, unit: 'units' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(400);
    });

    it('should use tenantId from JWT context, not request body', async () => {
      const { app, mockDB } = createTestApp('TENANT_ADMIN', 'jwt-tenant-id');
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: 'Widget A',
          quantity: 100,
          unit: 'units',
          tenantId: 'spoofed-tenant-id', // Must be ignored
        }),
      }, buildMockEnv(mockDB));
      const body = await res.json() as any;
      expect(body.data.tenant_id).toBe('jwt-tenant-id');
      expect(body.data.tenant_id).not.toBe('spoofed-tenant-id');
    });

    it('should set initial status to DRAFT', async () => {
      const { app, mockDB } = createTestApp('PRODUCTION_MANAGER');
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: 'Steel Beam', quantity: 50, unit: 'tonnes' }),
      }, buildMockEnv(mockDB));
      const body = await res.json() as any;
      expect(body.data.status).toBe('DRAFT');
    });
  });

  // ─── PATCH /orders/:id ──────────────────────────────────────────────────────
  describe('PATCH /orders/:id', () => {
    it('should return 200 for FLOOR_SUPERVISOR updating an order', async () => {
      const { app, mockDB } = createTestApp('FLOOR_SUPERVISOR', 'tenant-123', {
        firstResult: sampleOrder, // existing order
      });
      // Second call to get updated order after patch
      mockDB._stmt.first
        .mockResolvedValueOnce(sampleOrder) // existing check
        .mockResolvedValueOnce({ ...sampleOrder, status: 'IN_PROGRESS' }); // after update

      const res = await app.request('/orders/order-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(200);
    });

    it('should return 403 for VIEWER trying to update', async () => {
      const { app, mockDB } = createTestApp('VIEWER');
      const res = await app.request('/orders/order-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent order', async () => {
      const { app, mockDB } = createTestApp('FLOOR_SUPERVISOR', 'tenant-123', {
        firstResult: null,
      });
      const res = await app.request('/orders/nonexistent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(404);
    });

    it('should return 422 for invalid status transition DRAFT→COMPLETED', async () => {
      const { app, mockDB } = createTestApp('TENANT_ADMIN', 'tenant-123', {
        firstResult: { ...sampleOrder, status: 'DRAFT' },
      });
      const res = await app.request('/orders/order-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }), // Invalid: DRAFT→COMPLETED not allowed
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(422);
      const body = await res.json() as any;
      expect(body.error).toContain('Invalid status transition');
    });

    it('should allow valid transition DRAFT→IN_PROGRESS', async () => {
      const { app, mockDB } = createTestApp('FLOOR_SUPERVISOR', 'tenant-123');
      mockDB._stmt.first
        .mockResolvedValueOnce({ ...sampleOrder, status: 'DRAFT' })
        .mockResolvedValueOnce({ ...sampleOrder, status: 'IN_PROGRESS' });

      const res = await app.request('/orders/order-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(200);
    });

    it('should allow valid transition IN_PROGRESS→COMPLETED', async () => {
      const { app, mockDB } = createTestApp('PRODUCTION_MANAGER', 'tenant-123');
      mockDB._stmt.first
        .mockResolvedValueOnce({ ...sampleOrder, status: 'IN_PROGRESS' })
        .mockResolvedValueOnce({ ...sampleOrder, status: 'COMPLETED' });

      const res = await app.request('/orders/order-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(200);
    });

    it('should reject COMPLETED→IN_PROGRESS (no going back)', async () => {
      const { app, mockDB } = createTestApp('TENANT_ADMIN', 'tenant-123', {
        firstResult: { ...sampleOrder, status: 'COMPLETED' },
      });
      const res = await app.request('/orders/order-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(422);
    });
  });

  // ─── DELETE /orders/:id ─────────────────────────────────────────────────────
  describe('DELETE /orders/:id', () => {
    it('should return 200 for TENANT_ADMIN deleting a DRAFT order', async () => {
      const { app, mockDB } = createTestApp('TENANT_ADMIN', 'tenant-123', {
        firstResult: { ...sampleOrder, status: 'DRAFT' },
      });
      const res = await app.request('/orders/order-001', {
        method: 'DELETE',
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(200);
    });

    it('should return 403 for FLOOR_SUPERVISOR trying to delete', async () => {
      const { app, mockDB } = createTestApp('FLOOR_SUPERVISOR');
      const res = await app.request('/orders/order-001', {
        method: 'DELETE',
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(403);
    });

    it('should return 404 when order not found', async () => {
      const { app, mockDB } = createTestApp('TENANT_ADMIN', 'tenant-123', {
        firstResult: null,
      });
      const res = await app.request('/orders/nonexistent', {
        method: 'DELETE',
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(404);
    });

    it('should return 422 for deleting an IN_PROGRESS order', async () => {
      const { app, mockDB } = createTestApp('TENANT_ADMIN', 'tenant-123', {
        firstResult: { ...sampleOrder, status: 'IN_PROGRESS' },
      });
      const res = await app.request('/orders/order-001', {
        method: 'DELETE',
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(422);
      const body = await res.json() as any;
      expect(body.error).toContain('Cannot delete');
    });

    it('should allow deleting a CANCELLED order', async () => {
      const { app, mockDB } = createTestApp('TENANT_ADMIN', 'tenant-123', {
        firstResult: { ...sampleOrder, status: 'CANCELLED' },
      });
      const res = await app.request('/orders/order-001', {
        method: 'DELETE',
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(200);
    });
  });

  // ─── GET /orders/:orderId/bom ────────────────────────────────────────────────
  describe('GET /orders/:orderId/bom', () => {
    it('should return 200 for VIEWER', async () => {
      const { app, mockDB } = createTestApp('VIEWER', 'tenant-123');
      mockDB._stmt.first.mockResolvedValueOnce({ id: 'order-001' }); // order exists
      mockDB._stmt.all.mockResolvedValueOnce({ results: [sampleBomItem] });

      const res = await app.request('/orders/order-001/bom', {}, buildMockEnv(mockDB));
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should return 404 if order not found', async () => {
      const { app, mockDB } = createTestApp('VIEWER', 'tenant-123', { firstResult: null });
      const res = await app.request('/orders/nonexistent/bom', {}, buildMockEnv(mockDB));
      expect(res.status).toBe(404);
    });
  });

  // ─── POST /orders/:orderId/bom ───────────────────────────────────────────────
  describe('POST /orders/:orderId/bom', () => {
    it('should return 201 for PRODUCTION_MANAGER', async () => {
      const { app, mockDB } = createTestApp('PRODUCTION_MANAGER', 'tenant-123');
      mockDB._stmt.first.mockResolvedValueOnce({ id: 'order-001' }); // order exists

      const res = await app.request('/orders/order-001/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentName: 'Steel Rod', quantityRequired: 50, unit: 'kg' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.data.component_name).toBe('Steel Rod');
    });

    it('should return 403 for FLOOR_SUPERVISOR adding BOM', async () => {
      const { app, mockDB } = createTestApp('FLOOR_SUPERVISOR');
      const res = await app.request('/orders/order-001/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentName: 'Steel Rod', quantityRequired: 50, unit: 'kg' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(403);
    });

    it('should return 400 when required fields are missing', async () => {
      const { app, mockDB } = createTestApp('PRODUCTION_MANAGER');
      const res = await app.request('/orders/order-001/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentName: 'Steel Rod' }), // missing quantityRequired and unit
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(400);
    });

    it('should return 400 for non-positive quantityRequired', async () => {
      const { app, mockDB } = createTestApp('PRODUCTION_MANAGER');
      const res = await app.request('/orders/order-001/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentName: 'Steel Rod', quantityRequired: 0, unit: 'kg' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(400);
    });
  });

  // ─── Quality Checks ──────────────────────────────────────────────────────────
  describe('Quality Checks', () => {
    it('should return 200 for VIEWER listing quality checks', async () => {
      const { app, mockDB } = createTestApp('VIEWER', 'tenant-123');
      mockDB._stmt.first.mockResolvedValueOnce({ id: 'order-001' });
      mockDB._stmt.all.mockResolvedValueOnce({ results: [sampleQualityCheck] });

      const res = await app.request('/orders/order-001/quality', {}, buildMockEnv(mockDB));
      expect(res.status).toBe(200);
    });

    it('should return 201 for QC_INSPECTOR recording a check', async () => {
      const { app, mockDB } = createTestApp('QC_INSPECTOR', 'tenant-123');
      mockDB._stmt.first.mockResolvedValueOnce({ id: 'order-001' }); // order exists

      const res = await app.request('/orders/order-001/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkType: 'FINAL', result: 'PASS', notes: 'All good' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.data.result).toBe('PASS');
      expect(body.data.check_type).toBe('FINAL');
    });

    it('should return 403 for VIEWER recording a quality check', async () => {
      const { app, mockDB } = createTestApp('VIEWER');
      const res = await app.request('/orders/order-001/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkType: 'FINAL', result: 'PASS' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid checkType', async () => {
      const { app, mockDB } = createTestApp('QC_INSPECTOR');
      const res = await app.request('/orders/order-001/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkType: 'INVALID', result: 'PASS' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid result', async () => {
      const { app, mockDB } = createTestApp('QC_INSPECTOR');
      const res = await app.request('/orders/order-001/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkType: 'FINAL', result: 'MAYBE' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(400);
    });

    it('should set checkedBy from JWT sub claim', async () => {
      const { app, mockDB } = createTestApp('QC_INSPECTOR', 'tenant-123');
      mockDB._stmt.first.mockResolvedValueOnce({ id: 'order-001' });

      const res = await app.request('/orders/order-001/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkType: 'IN_PROCESS', result: 'FAIL', notes: 'Scratch found' }),
      }, buildMockEnv(mockDB));
      const body = await res.json() as any;
      expect(body.data.checked_by).toBe('user-001'); // from JWT sub
    });
  });

  // ─── Production Tasks (Floor Supervision — PROD-004) ──────────────────────
  describe('Production Tasks (Floor Supervision)', () => {
    it('should return 200 listing tasks for VIEWER', async () => {
      const { app, mockDB } = createTestApp('VIEWER', 'tenant-123');
      mockDB._stmt.first.mockResolvedValueOnce({ id: 'order-001' });
      mockDB._stmt.all.mockResolvedValueOnce({ results: [sampleTask] });

      const res = await app.request('/orders/order-001/tasks', {}, buildMockEnv(mockDB));
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should return 201 for FLOOR_SUPERVISOR creating a task', async () => {
      const { app, mockDB } = createTestApp('FLOOR_SUPERVISOR', 'tenant-123');
      mockDB._stmt.first.mockResolvedValueOnce({ id: 'order-001' });

      const res = await app.request('/orders/order-001/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName: 'Assembly', stationId: 'station-A', assignedTo: 'user-002' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.data.task_name).toBe('Assembly');
      expect(body.data.status).toBe('PENDING');
    });

    it('should return 400 when taskName is missing', async () => {
      const { app, mockDB } = createTestApp('FLOOR_SUPERVISOR');
      const res = await app.request('/orders/order-001/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId: 'station-A' }), // missing taskName
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(400);
    });

    it('should return 200 for FLOOR_SUPERVISOR updating task status to IN_PROGRESS', async () => {
      const { app, mockDB } = createTestApp('FLOOR_SUPERVISOR', 'tenant-123');
      mockDB._stmt.first
        .mockResolvedValueOnce({ ...sampleTask, start_time: null })
        .mockResolvedValueOnce({ ...sampleTask, status: 'IN_PROGRESS', start_time: new Date().toISOString() });

      const res = await app.request('/orders/order-001/tasks/task-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(200);
    });

    it('should auto-set start_time when task moves to IN_PROGRESS', async () => {
      const { app, mockDB } = createTestApp('PRODUCTION_MANAGER', 'tenant-123');
      const startedTask = { ...sampleTask, status: 'IN_PROGRESS', start_time: '2026-04-06T10:00:00.000Z' };
      mockDB._stmt.first
        .mockResolvedValueOnce({ ...sampleTask, status: 'PENDING', start_time: null })
        .mockResolvedValueOnce(startedTask);

      const res = await app.request('/orders/order-001/tasks/task-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.data.start_time).not.toBeNull();
    });

    it('should return 404 for non-existent task', async () => {
      const { app, mockDB } = createTestApp('FLOOR_SUPERVISOR', 'tenant-123', { firstResult: null });
      const res = await app.request('/orders/order-001/tasks/nonexistent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      }, buildMockEnv(mockDB));
      expect(res.status).toBe(404);
    });

    it('GET /tasks — should return 200 for FLOOR_SUPERVISOR dashboard view', async () => {
      const { app, mockDB } = createTestApp('FLOOR_SUPERVISOR', 'tenant-123', {
        allResult: { results: [{ ...sampleTask, order_number: 'PO-001', product_name: 'Widget A' }] },
      });
      const res = await app.request('/tasks', {}, buildMockEnv(mockDB));
      expect(res.status).toBe(200);
    });

    it('GET /tasks — should return 403 for VIEWER', async () => {
      const { app, mockDB } = createTestApp('VIEWER');
      const res = await app.request('/tasks', {}, buildMockEnv(mockDB));
      expect(res.status).toBe(403);
    });
  });

  // ─── Multi-tenant Isolation ───────────────────────────────────────────────
  describe('Multi-tenant Isolation', () => {
    it('should always use tenantId from JWT for DB queries', async () => {
      const { app, mockDB } = createTestApp('TENANT_ADMIN', 'jwt-tenant-id', {
        allResult: { results: [] },
        firstResult: { total: 0 },
      });
      await app.request('/orders', {}, buildMockEnv(mockDB));
      // First bind argument should be the tenant ID from JWT
      const bindCalls = mockDB._stmt.bind.mock.calls;
      expect(bindCalls.length).toBeGreaterThan(0);
      const firstBindCall = bindCalls[0] as unknown[];
      expect(firstBindCall[0]).toBe('jwt-tenant-id');
    });

    it('should not allow tenant A to see tenant B orders via orderId', async () => {
      const { app, mockDB } = createTestApp('VIEWER', 'tenant-A', { firstResult: null });
      // Tenant A cannot find order-001 which belongs to tenant-B
      const res = await app.request('/orders/order-001', {}, buildMockEnv(mockDB));
      expect(res.status).toBe(404);
    });
  });
});
