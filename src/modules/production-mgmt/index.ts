/**
 * WebWaka Production Suite — Production Management Module
 * Blueprint Reference: Part 10.x — Production Vertical, PROD-1 Epic
 *
 * Invariant 1: Build Once Use Infinitely — auth from @webwaka/core
 * Invariant 4: Offline First — all writes mirrored in Dexie (client-side)
 * Invariant 5: Nigeria First — monetary values in kobo
 *
 * RBAC Enforcement:
 * - GET routes: VIEWER and above
 * - POST/PATCH routes: FLOOR_SUPERVISOR and above
 * - DELETE routes: TENANT_ADMIN and above
 *
 * Tenant Isolation:
 * tenantId is ALWAYS sourced from c.get('tenantId') (JWT payload).
 * NEVER accept tenantId from request body, query params, or headers.
 */

import { Hono } from 'hono';
import { requireRole } from '@webwaka/core';
import type { ProductionBindings } from '../../core/types.js';
import type { JWTPayload } from '@webwaka/core';

interface Variables {
  user: JWTPayload;
  tenantId: string;
}

export const productionMgmtRouter = new Hono<{
  Bindings: ProductionBindings;
  Variables: Variables;
}>();

// ─── Production Orders ────────────────────────────────────────────────────────

/**
 * GET /api/production/mgmt/orders
 * List all production orders for the authenticated tenant.
 * RBAC: VIEWER and above
 */
productionMgmtRouter.get(
  '/orders',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN', 'PRODUCTION_MANAGER', 'FLOOR_SUPERVISOR', 'QC_INSPECTOR', 'VIEWER']),
  async (c) => {
    // tenantId ALWAYS from JWT — Invariant: Tenant Isolation
    const tenantId = c.get('tenantId');
    const page = parseInt(c.req.query('page') ?? '1', 10);
    const pageSize = Math.min(parseInt(c.req.query('pageSize') ?? '20', 10), 100);
    const offset = (page - 1) * pageSize;

    // TODO (Replit Agent PROD-1): Implement D1 query
    // const { results, meta } = await c.env.DB.prepare(
    //   'SELECT * FROM production_orders WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    // ).bind(tenantId, pageSize, offset).all();
    //
    // const { results: countResult } = await c.env.DB.prepare(
    //   'SELECT COUNT(*) as total FROM production_orders WHERE tenant_id = ?'
    // ).bind(tenantId).all();

    return c.json({
      success: true,
      data: [], // TODO: Replace with D1 results
      pagination: {
        page,
        pageSize,
        total: 0, // TODO: Replace with count
        totalPages: 0,
      },
    });
  }
);

/**
 * POST /api/production/mgmt/orders
 * Create a new production order.
 * RBAC: FLOOR_SUPERVISOR and above
 */
productionMgmtRouter.post(
  '/orders',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN', 'PRODUCTION_MANAGER', 'FLOOR_SUPERVISOR']),
  async (c) => {
    const tenantId = c.get('tenantId'); // ALWAYS from JWT
    const user = c.get('user');
    const body = await c.req.json<{
      productName: string;
      quantity: number;
      unit: string;
      scheduledStartDate?: string;
      scheduledEndDate?: string;
      notes?: string;
    }>();

    if (!body.productName || !body.quantity || !body.unit) {
      return c.json({ success: false, error: 'productName, quantity, and unit are required' }, 400);
    }

    const id = crypto.randomUUID();
    const orderNumber = `PO-${Date.now()}`;
    const now = new Date().toISOString();

    // TODO (Replit Agent PROD-1): Implement D1 insert
    // await c.env.DB.prepare(
    //   `INSERT INTO production_orders
    //    (id, tenant_id, order_number, product_name, quantity, unit, status,
    //     scheduled_start_date, scheduled_end_date, notes, created_by, created_at, updated_at)
    //    VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?)`
    // ).bind(
    //   id, tenantId, orderNumber, body.productName, body.quantity, body.unit,
    //   body.scheduledStartDate ?? null, body.scheduledEndDate ?? null,
    //   body.notes ?? null, user.sub, now, now
    // ).run();

    return c.json({
      success: true,
      data: {
        id,
        tenantId,
        orderNumber,
        productName: body.productName,
        quantity: body.quantity,
        unit: body.unit,
        status: 'DRAFT',
        scheduledStartDate: body.scheduledStartDate ?? null,
        scheduledEndDate: body.scheduledEndDate ?? null,
        notes: body.notes ?? null,
        createdBy: user.sub,
        createdAt: now,
        updatedAt: now,
      },
    }, 201);
  }
);

/**
 * PATCH /api/production/mgmt/orders/:id
 * Update a production order status or details.
 * RBAC: FLOOR_SUPERVISOR and above
 */
productionMgmtRouter.patch(
  '/orders/:id',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN', 'PRODUCTION_MANAGER', 'FLOOR_SUPERVISOR']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();
    const body = await c.req.json();

    // TODO (Replit Agent PROD-1): Implement D1 update with tenant isolation check
    // const existing = await c.env.DB.prepare(
    //   'SELECT id FROM production_orders WHERE id = ? AND tenant_id = ?'
    // ).bind(id, tenantId).first();
    // if (!existing) return c.json({ success: false, error: 'Not found' }, 404);

    return c.json({ success: true, data: { id, ...body, tenantId, updatedAt: new Date().toISOString() } });
  }
);

/**
 * DELETE /api/production/mgmt/orders/:id
 * Delete a production order (TENANT_ADMIN and above only).
 * RBAC: TENANT_ADMIN and above
 */
productionMgmtRouter.delete(
  '/orders/:id',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();

    // TODO (Replit Agent PROD-1): Implement D1 delete with tenant isolation check
    // const result = await c.env.DB.prepare(
    //   'DELETE FROM production_orders WHERE id = ? AND tenant_id = ?'
    // ).bind(id, tenantId).run();
    // if (result.meta.changes === 0) return c.json({ success: false, error: 'Not found' }, 404);

    return c.json({ success: true, message: 'Production order deleted' });
  }
);

// ─── Bill of Materials ────────────────────────────────────────────────────────

/**
 * GET /api/production/mgmt/orders/:orderId/bom
 * Get the Bill of Materials for a production order.
 * RBAC: VIEWER and above
 */
productionMgmtRouter.get(
  '/orders/:orderId/bom',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN', 'PRODUCTION_MANAGER', 'FLOOR_SUPERVISOR', 'QC_INSPECTOR', 'VIEWER']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const { orderId } = c.req.param();

    // TODO (Replit Agent PROD-1): Implement D1 query
    return c.json({ success: true, data: [] });
  }
);

/**
 * POST /api/production/mgmt/orders/:orderId/bom
 * Add a component to the Bill of Materials.
 * RBAC: PRODUCTION_MANAGER and above
 */
productionMgmtRouter.post(
  '/orders/:orderId/bom',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN', 'PRODUCTION_MANAGER']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const { orderId } = c.req.param();
    const body = await c.req.json();

    // TODO (Replit Agent PROD-1): Implement D1 insert
    return c.json({ success: true, data: { id: crypto.randomUUID(), tenantId, productionOrderId: orderId, ...body } }, 201);
  }
);

// ─── Quality Checks ───────────────────────────────────────────────────────────

/**
 * GET /api/production/mgmt/orders/:orderId/quality
 * List quality checks for a production order.
 * RBAC: VIEWER and above
 */
productionMgmtRouter.get(
  '/orders/:orderId/quality',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN', 'PRODUCTION_MANAGER', 'FLOOR_SUPERVISOR', 'QC_INSPECTOR', 'VIEWER']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const { orderId } = c.req.param();

    // TODO (Replit Agent PROD-1): Implement D1 query
    return c.json({ success: true, data: [] });
  }
);

/**
 * POST /api/production/mgmt/orders/:orderId/quality
 * Record a quality check result.
 * RBAC: QC_INSPECTOR and above
 */
productionMgmtRouter.post(
  '/orders/:orderId/quality',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN', 'PRODUCTION_MANAGER', 'FLOOR_SUPERVISOR', 'QC_INSPECTOR']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const user = c.get('user');
    const { orderId } = c.req.param();
    const body = await c.req.json();

    // TODO (Replit Agent PROD-1): Implement D1 insert
    return c.json({
      success: true,
      data: {
        id: crypto.randomUUID(),
        tenantId,
        productionOrderId: orderId,
        checkedBy: user.sub,
        createdAt: new Date().toISOString(),
        ...body,
      },
    }, 201);
  }
);
