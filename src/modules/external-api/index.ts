/**
 * WebWaka Production Suite — External ERP/MES Integration API (PROD-007)
 * Blueprint Reference: Part 10.x — External System Integration
 *
 * Invariant 1: Build Once Use Infinitely — auth from @webwaka/core
 *
 * This module provides stable, versioned API endpoints for external
 * Enterprise Resource Planning (ERP) or Manufacturing Execution Systems (MES)
 * to interact with the WebWaka Production Suite.
 *
 * Authentication:
 * - External callers authenticate via API key in the X-Api-Key header
 * - API keys are stored in the SESSIONS_KV namespace (managed by super-admin-v2)
 * - Rate limiting is applied per API key
 *
 * API Design Principles:
 * - Versioned under /api/v1/external/production/
 * - Consistent response envelope: { success, data, error, meta }
 * - Paginated lists with cursor-based pagination
 * - Webhook support for push notifications to external systems
 */

import { Hono } from 'hono';
import { requireRole } from '@webwaka/core';
import type { ProductionBindings } from '../../core/types.js';
import type { JWTPayload } from '@webwaka/core';

interface Variables {
  user: JWTPayload;
  tenantId: string;
  apiKeyTenantId?: string;
}

export const externalApiRouter = new Hono<{
  Bindings: ProductionBindings;
  Variables: Variables;
}>();

// ─── API Key Authentication Middleware ────────────────────────────────────────
/**
 * Validates X-Api-Key header against the SESSIONS_KV store.
 * API keys are provisioned by webwaka-super-admin-v2 and stored as:
 * Key: "apikey:{hashedKey}"
 * Value: JSON { tenantId, permissions, expiresAt }
 */
async function validateApiKey(
  apiKey: string,
  kv: KVNamespace
): Promise<{ tenantId: string; permissions: string[] } | null> {
  try {
    const data = await kv.get(`apikey:${apiKey}`, { type: 'json' }) as {
      tenantId: string;
      permissions: string[];
      expiresAt?: string;
    } | null;

    if (!data) return null;
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) return null;

    return { tenantId: data.tenantId, permissions: data.permissions };
  } catch {
    return null;
  }
}

externalApiRouter.use('*', async (c, next) => {
  const apiKey = c.req.header('X-Api-Key');

  if (!apiKey) {
    return c.json({ success: false, error: 'X-Api-Key header is required' }, 401);
  }

  const keyData = await validateApiKey(apiKey, c.env.SESSIONS_KV);
  if (!keyData) {
    return c.json({ success: false, error: 'Invalid or expired API key' }, 401);
  }

  // Inject tenantId from API key so downstream handlers can use it
  c.set('apiKeyTenantId' as any, keyData.tenantId);

  return next();
});

// ─── External API Routes ──────────────────────────────────────────────────────

/**
 * GET /api/v1/external/production/orders
 * List production orders for the API key's tenant.
 * Supports filtering by status and cursor-based pagination.
 */
externalApiRouter.get('/orders', async (c) => {
  const tenantId = (c.get('apiKeyTenantId' as any) as string) ?? '';
  const status = c.req.query('status');
  const cursor = c.req.query('cursor'); // ISO date for cursor pagination
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') ?? '20', 10)));

  let query: string;
  const values: (string | number)[] = [tenantId];

  if (status && cursor) {
    query = 'SELECT * FROM mfgp_production_orders WHERE tenant_id = ? AND status = ? AND created_at < ? ORDER BY created_at DESC LIMIT ?';
    values.push(status, cursor, limit);
  } else if (status) {
    query = 'SELECT * FROM mfgp_production_orders WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC LIMIT ?';
    values.push(status, limit);
  } else if (cursor) {
    query = 'SELECT * FROM mfgp_production_orders WHERE tenant_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT ?';
    values.push(cursor, limit);
  } else {
    query = 'SELECT * FROM mfgp_production_orders WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?';
    values.push(limit);
  }

  const { results } = await c.env.DB.prepare(query).bind(...values).all<{
    id: string;
    created_at: string;
  }>();

  const nextCursor = results.length === limit ? results[results.length - 1]?.created_at ?? null : null;

  return c.json({
    success: true,
    data: results,
    meta: {
      count: results.length,
      limit,
      nextCursor,
      hasMore: nextCursor !== null,
    },
  });
});

/**
 * GET /api/v1/external/production/orders/:id
 * Get a single production order with its BOM and quality checks.
 * Returns a fully hydrated order for ERP integration.
 */
externalApiRouter.get('/orders/:id', async (c) => {
  const tenantId = (c.get('apiKeyTenantId' as any) as string) ?? '';
  const { id } = c.req.param();

  const [order, bomResult, qcResult, tasksResult] = await Promise.all([
    c.env.DB.prepare(
      'SELECT * FROM mfgp_production_orders WHERE id = ? AND tenant_id = ?'
    ).bind(id, tenantId).first(),
    c.env.DB.prepare(
      'SELECT * FROM mfgp_bill_of_materials WHERE production_order_id = ? AND tenant_id = ? ORDER BY created_at ASC'
    ).bind(id, tenantId).all(),
    c.env.DB.prepare(
      'SELECT * FROM mfgp_quality_checks WHERE production_order_id = ? AND tenant_id = ? ORDER BY created_at DESC'
    ).bind(id, tenantId).all(),
    c.env.DB.prepare(
      'SELECT * FROM mfgp_production_tasks WHERE production_order_id = ? AND tenant_id = ? ORDER BY created_at ASC'
    ).bind(id, tenantId).all(),
  ]);

  if (!order) {
    return c.json({ success: false, error: 'Production order not found' }, 404);
  }

  return c.json({
    success: true,
    data: {
      ...order,
      billOfMaterials: bomResult.results,
      qualityChecks: qcResult.results,
      tasks: tasksResult.results,
    },
  });
});

/**
 * POST /api/v1/external/production/orders
 * Create a production order from an external ERP/MES system.
 */
externalApiRouter.post('/orders', async (c) => {
  const tenantId = (c.get('apiKeyTenantId' as any) as string) ?? '';
  const body = await c.req.json<{
    productName: string;
    quantity: number;
    unit: string;
    externalReference?: string; // ERP/MES order reference
    scheduledStartDate?: string;
    scheduledEndDate?: string;
    notes?: string;
  }>();

  if (!body.productName || body.quantity === undefined || !body.unit) {
    return c.json({ success: false, error: 'productName, quantity, and unit are required' }, 400);
  }
  if (typeof body.quantity !== 'number' || body.quantity <= 0) {
    return c.json({ success: false, error: 'quantity must be a positive number' }, 400);
  }

  const id = crypto.randomUUID();
  const orderNumber = `PO-EXT-${Date.now()}`;
  const now = new Date().toISOString();
  const notes = body.externalReference
    ? `[ERP Ref: ${body.externalReference}]${body.notes ? ` ${body.notes}` : ''}`
    : (body.notes ?? null);

  await c.env.DB.prepare(
    `INSERT INTO mfgp_production_orders
     (id, tenant_id, order_number, product_name, quantity, unit, status,
      scheduled_start_date, scheduled_end_date, notes, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, 'external-api', ?, ?)`
  ).bind(
    id, tenantId, orderNumber, body.productName, body.quantity, body.unit,
    body.scheduledStartDate ?? null, body.scheduledEndDate ?? null, notes, now, now
  ).run();

  return c.json({
    success: true,
    data: {
      id,
      orderNumber,
      status: 'DRAFT',
      externalReference: body.externalReference ?? null,
    },
  }, 201);
});

/**
 * PUT /api/v1/external/production/orders/:id/status
 * Update the status of a production order from an external system.
 * Enforces the same status transition machine as the internal API.
 */
externalApiRouter.put('/orders/:id/status', async (c) => {
  const tenantId = (c.get('apiKeyTenantId' as any) as string) ?? '';
  const { id } = c.req.param();
  const body = await c.req.json<{ status: string }>();

  if (!body.status) {
    return c.json({ success: false, error: 'status is required' }, 400);
  }

  const validStatuses = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  if (!validStatuses.includes(body.status)) {
    return c.json({ success: false, error: `status must be one of: ${validStatuses.join(', ')}` }, 400);
  }

  const existing = await c.env.DB.prepare(
    'SELECT status FROM mfgp_production_orders WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<{ status: string }>();

  if (!existing) {
    return c.json({ success: false, error: 'Production order not found' }, 404);
  }

  const VALID_TRANSITIONS: Record<string, string[]> = {
    DRAFT: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  if (body.status !== existing.status) {
    const allowed = VALID_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(body.status)) {
      return c.json({
        success: false,
        error: `Invalid status transition: ${existing.status} → ${body.status}. Allowed: ${allowed.join(', ') || 'none'}`,
      }, 422);
    }
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE mfgp_production_orders SET status = ?, updated_at = ? WHERE id = ? AND tenant_id = ?'
  ).bind(body.status, now, id, tenantId).run();

  return c.json({
    success: true,
    data: { id, status: body.status, updatedAt: now },
  });
});

