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
 *
 * Status Machine (PROD-001/PROD-008):
 * Valid transitions: DRAFT→IN_PROGRESS, DRAFT→CANCELLED,
 *                   IN_PROGRESS→COMPLETED, IN_PROGRESS→CANCELLED
 */

import { Hono } from 'hono';
import { requireRole } from '@webwaka/core';
import type { ProductionBindings } from '../../core/types.js';
import type { JWTPayload } from '@webwaka/core';

interface Variables {
  user: JWTPayload;
  tenantId: string;
}

// ─── Valid Status Transitions (PROD-008) ─────────────────────────────────────
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

function isValidTransition(from: string, to: string): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

export const productionMgmtRouter = new Hono<{
  Bindings: ProductionBindings;
  Variables: Variables;
}>();

// ─── Production Orders (PROD-001) ────────────────────────────────────────────

/**
 * GET /api/production/mgmt/orders
 * List all production orders for the authenticated tenant.
 * RBAC: VIEWER and above
 */
productionMgmtRouter.get(
  '/orders',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN', 'PRODUCTION_MANAGER', 'FLOOR_SUPERVISOR', 'QC_INSPECTOR', 'VIEWER']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('pageSize') ?? '20', 10)));
    const offset = (page - 1) * pageSize;
    const statusFilter = c.req.query('status');

    let query: string;
    let countQuery: string;
    let bindings: (string | number)[];
    let countBindings: (string | number)[];

    if (statusFilter) {
      query = 'SELECT * FROM production_orders WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      countQuery = 'SELECT COUNT(*) as total FROM production_orders WHERE tenant_id = ? AND status = ?';
      bindings = [tenantId, statusFilter, pageSize, offset];
      countBindings = [tenantId, statusFilter];
    } else {
      query = 'SELECT * FROM production_orders WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      countQuery = 'SELECT COUNT(*) as total FROM production_orders WHERE tenant_id = ?';
      bindings = [tenantId, pageSize, offset];
      countBindings = [tenantId];
    }

    const [{ results }, countResult] = await Promise.all([
      c.env.DB.prepare(query).bind(...bindings).all(),
      c.env.DB.prepare(countQuery).bind(...countBindings).first<{ total: number }>(),
    ]);

    const total = countResult?.total ?? 0;

    return c.json({
      success: true,
      data: results,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  }
);

/**
 * GET /api/production/mgmt/orders/:id
 * Get a single production order by ID.
 * RBAC: VIEWER and above
 */
productionMgmtRouter.get(
  '/orders/:id',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN', 'PRODUCTION_MANAGER', 'FLOOR_SUPERVISOR', 'QC_INSPECTOR', 'VIEWER']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();

    const order = await c.env.DB.prepare(
      'SELECT * FROM production_orders WHERE id = ? AND tenant_id = ?'
    ).bind(id, tenantId).first();

    if (!order) {
      return c.json({ success: false, error: 'Production order not found' }, 404);
    }

    return c.json({ success: true, data: order });
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
    const tenantId = c.get('tenantId');
    const user = c.get('user');
    const body = await c.req.json<{
      productName: string;
      quantity: number;
      unit: string;
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
    const orderNumber = `PO-${Date.now()}`;
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO production_orders
       (id, tenant_id, order_number, product_name, quantity, unit, status,
        scheduled_start_date, scheduled_end_date, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, tenantId, orderNumber, body.productName, body.quantity, body.unit,
      body.scheduledStartDate ?? null, body.scheduledEndDate ?? null,
      body.notes ?? null, user.sub, now, now
    ).run();

    return c.json({
      success: true,
      data: {
        id,
        tenant_id: tenantId,
        order_number: orderNumber,
        product_name: body.productName,
        quantity: body.quantity,
        unit: body.unit,
        status: 'DRAFT',
        scheduled_start_date: body.scheduledStartDate ?? null,
        scheduled_end_date: body.scheduledEndDate ?? null,
        actual_start_date: null,
        actual_end_date: null,
        notes: body.notes ?? null,
        created_by: user.sub,
        created_at: now,
        updated_at: now,
      },
    }, 201);
  }
);

/**
 * PATCH /api/production/mgmt/orders/:id
 * Update a production order — status transitions enforced.
 * RBAC: FLOOR_SUPERVISOR and above
 */
productionMgmtRouter.patch(
  '/orders/:id',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN', 'PRODUCTION_MANAGER', 'FLOOR_SUPERVISOR']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();
    const body = await c.req.json<{
      status?: string;
      productName?: string;
      quantity?: number;
      unit?: string;
      scheduledStartDate?: string;
      scheduledEndDate?: string;
      actualStartDate?: string;
      actualEndDate?: string;
      notes?: string;
    }>();

    const existing = await c.env.DB.prepare(
      'SELECT * FROM production_orders WHERE id = ? AND tenant_id = ?'
    ).bind(id, tenantId).first<{ status: string }>();

    if (!existing) {
      return c.json({ success: false, error: 'Production order not found' }, 404);
    }

    // Enforce status transition machine (PROD-008)
    if (body.status && body.status !== existing.status) {
      if (!isValidTransition(existing.status, body.status)) {
        return c.json({
          success: false,
          error: `Invalid status transition: ${existing.status} → ${body.status}. Allowed: ${(VALID_TRANSITIONS[existing.status] ?? []).join(', ') || 'none'}`,
        }, 422);
      }
    }

    const now = new Date().toISOString();

    // Build dynamic update — only update provided fields
    const updates: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (body.status) { updates.push('status = ?'); values.push(body.status); }
    if (body.productName) { updates.push('product_name = ?'); values.push(body.productName); }
    if (body.quantity !== undefined) { updates.push('quantity = ?'); values.push(body.quantity); }
    if (body.unit) { updates.push('unit = ?'); values.push(body.unit); }
    if (body.scheduledStartDate !== undefined) { updates.push('scheduled_start_date = ?'); values.push(body.scheduledStartDate ?? null); }
    if (body.scheduledEndDate !== undefined) { updates.push('scheduled_end_date = ?'); values.push(body.scheduledEndDate ?? null); }
    if (body.actualStartDate !== undefined) { updates.push('actual_start_date = ?'); values.push(body.actualStartDate ?? null); }
    if (body.actualEndDate !== undefined) { updates.push('actual_end_date = ?'); values.push(body.actualEndDate ?? null); }
    if (body.notes !== undefined) { updates.push('notes = ?'); values.push(body.notes ?? null); }

    values.push(id, tenantId);

    await c.env.DB.prepare(
      `UPDATE production_orders SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`
    ).bind(...values).run();

    const updated = await c.env.DB.prepare(
      'SELECT * FROM production_orders WHERE id = ? AND tenant_id = ?'
    ).bind(id, tenantId).first();

    return c.json({ success: true, data: updated });
  }
);

/**
 * DELETE /api/production/mgmt/orders/:id
 * Delete a production order (TENANT_ADMIN and above only).
 * Only DRAFT or CANCELLED orders may be deleted.
 * RBAC: TENANT_ADMIN and above
 */
productionMgmtRouter.delete(
  '/orders/:id',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();

    const existing = await c.env.DB.prepare(
      'SELECT status FROM production_orders WHERE id = ? AND tenant_id = ?'
    ).bind(id, tenantId).first<{ status: string }>();

    if (!existing) {
      return c.json({ success: false, error: 'Production order not found' }, 404);
    }
    if (!['DRAFT', 'CANCELLED'].includes(existing.status)) {
      return c.json({
        success: false,
        error: `Cannot delete a production order with status '${existing.status}'. Only DRAFT or CANCELLED orders may be deleted.`,
      }, 422);
    }

    await c.env.DB.prepare(
      'DELETE FROM production_orders WHERE id = ? AND tenant_id = ?'
    ).bind(id, tenantId).run();

    return c.json({ success: true, message: 'Production order deleted' });
  }
);

// ─── Bill of Materials (PROD-002) ─────────────────────────────────────────────

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

    // Verify the order belongs to the tenant
    const order = await c.env.DB.prepare(
      'SELECT id FROM production_orders WHERE id = ? AND tenant_id = ?'
    ).bind(orderId, tenantId).first();

    if (!order) {
      return c.json({ success: false, error: 'Production order not found' }, 404);
    }

    const { results } = await c.env.DB.prepare(
      'SELECT * FROM bill_of_materials WHERE production_order_id = ? AND tenant_id = ? ORDER BY created_at ASC'
    ).bind(orderId, tenantId).all();

    return c.json({ success: true, data: results });
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
    const body = await c.req.json<{
      componentName: string;
      componentSku?: string;
      quantityRequired: number;
      unit: string;
    }>();

    if (!body.componentName || body.quantityRequired === undefined || !body.unit) {
      return c.json({ success: false, error: 'componentName, quantityRequired, and unit are required' }, 400);
    }
    if (typeof body.quantityRequired !== 'number' || body.quantityRequired <= 0) {
      return c.json({ success: false, error: 'quantityRequired must be a positive number' }, 400);
    }

    // Verify the order belongs to the tenant
    const order = await c.env.DB.prepare(
      'SELECT id FROM production_orders WHERE id = ? AND tenant_id = ?'
    ).bind(orderId, tenantId).first();

    if (!order) {
      return c.json({ success: false, error: 'Production order not found' }, 404);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO bill_of_materials
       (id, tenant_id, production_order_id, component_name, component_sku, quantity_required, unit, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, tenantId, orderId, body.componentName, body.componentSku ?? null,
      body.quantityRequired, body.unit, now
    ).run();

    return c.json({
      success: true,
      data: {
        id,
        tenant_id: tenantId,
        production_order_id: orderId,
        component_name: body.componentName,
        component_sku: body.componentSku ?? null,
        quantity_required: body.quantityRequired,
        unit: body.unit,
        quantity_used: null,
        created_at: now,
      },
    }, 201);
  }
);

/**
 * PATCH /api/production/mgmt/orders/:orderId/bom/:id
 * Update a BOM item — e.g., mark quantity_used after production.
 * RBAC: FLOOR_SUPERVISOR and above
 */
productionMgmtRouter.patch(
  '/orders/:orderId/bom/:id',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN', 'PRODUCTION_MANAGER', 'FLOOR_SUPERVISOR']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const { orderId, id } = c.req.param();
    const body = await c.req.json<{ quantityUsed?: number }>();

    const item = await c.env.DB.prepare(
      'SELECT id FROM bill_of_materials WHERE id = ? AND production_order_id = ? AND tenant_id = ?'
    ).bind(id, orderId, tenantId).first();

    if (!item) {
      return c.json({ success: false, error: 'BOM item not found' }, 404);
    }

    await c.env.DB.prepare(
      'UPDATE bill_of_materials SET quantity_used = ? WHERE id = ? AND tenant_id = ?'
    ).bind(body.quantityUsed ?? null, id, tenantId).run();

    const updated = await c.env.DB.prepare(
      'SELECT * FROM bill_of_materials WHERE id = ?'
    ).bind(id).first();

    return c.json({ success: true, data: updated });
  }
);

// ─── Quality Checks (PROD-003) ────────────────────────────────────────────────

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

    const order = await c.env.DB.prepare(
      'SELECT id FROM production_orders WHERE id = ? AND tenant_id = ?'
    ).bind(orderId, tenantId).first();

    if (!order) {
      return c.json({ success: false, error: 'Production order not found' }, 404);
    }

    const { results } = await c.env.DB.prepare(
      'SELECT * FROM quality_checks WHERE production_order_id = ? AND tenant_id = ? ORDER BY created_at DESC'
    ).bind(orderId, tenantId).all();

    return c.json({ success: true, data: results });
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
    const body = await c.req.json<{
      checkType: 'IN_PROCESS' | 'FINAL' | 'INCOMING';
      result: 'PASS' | 'FAIL' | 'PENDING';
      notes?: string;
    }>();

    if (!body.checkType || !body.result) {
      return c.json({ success: false, error: 'checkType and result are required' }, 400);
    }

    const validCheckTypes = ['IN_PROCESS', 'FINAL', 'INCOMING'];
    const validResults = ['PASS', 'FAIL', 'PENDING'];
    if (!validCheckTypes.includes(body.checkType)) {
      return c.json({ success: false, error: `checkType must be one of: ${validCheckTypes.join(', ')}` }, 400);
    }
    if (!validResults.includes(body.result)) {
      return c.json({ success: false, error: `result must be one of: ${validResults.join(', ')}` }, 400);
    }

    // Verify the order belongs to the tenant
    const order = await c.env.DB.prepare(
      'SELECT id FROM production_orders WHERE id = ? AND tenant_id = ?'
    ).bind(orderId, tenantId).first();

    if (!order) {
      return c.json({ success: false, error: 'Production order not found' }, 404);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO quality_checks
       (id, tenant_id, production_order_id, check_type, result, checked_by, notes, checked_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, tenantId, orderId, body.checkType, body.result,
      user.sub, body.notes ?? null, now, now
    ).run();

    return c.json({
      success: true,
      data: {
        id,
        tenant_id: tenantId,
        production_order_id: orderId,
        check_type: body.checkType,
        result: body.result,
        checked_by: user.sub,
        notes: body.notes ?? null,
        checked_at: now,
        created_at: now,
      },
    }, 201);
  }
);

// ─── Floor Supervision Tasks (PROD-004) ──────────────────────────────────────

/**
 * GET /api/production/mgmt/orders/:orderId/tasks
 * List all tasks for a production order.
 * RBAC: VIEWER and above
 */
productionMgmtRouter.get(
  '/orders/:orderId/tasks',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN', 'PRODUCTION_MANAGER', 'FLOOR_SUPERVISOR', 'QC_INSPECTOR', 'VIEWER']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const { orderId } = c.req.param();

    const order = await c.env.DB.prepare(
      'SELECT id FROM production_orders WHERE id = ? AND tenant_id = ?'
    ).bind(orderId, tenantId).first();

    if (!order) {
      return c.json({ success: false, error: 'Production order not found' }, 404);
    }

    const { results } = await c.env.DB.prepare(
      'SELECT * FROM production_tasks WHERE production_order_id = ? AND tenant_id = ? ORDER BY created_at ASC'
    ).bind(orderId, tenantId).all();

    return c.json({ success: true, data: results });
  }
);

/**
 * POST /api/production/mgmt/orders/:orderId/tasks
 * Create a task for a production order.
 * RBAC: FLOOR_SUPERVISOR and above
 */
productionMgmtRouter.post(
  '/orders/:orderId/tasks',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN', 'PRODUCTION_MANAGER', 'FLOOR_SUPERVISOR']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const user = c.get('user');
    const { orderId } = c.req.param();
    const body = await c.req.json<{
      taskName: string;
      stationId?: string;
      assignedTo?: string;
      notes?: string;
    }>();

    if (!body.taskName) {
      return c.json({ success: false, error: 'taskName is required' }, 400);
    }

    const order = await c.env.DB.prepare(
      'SELECT id FROM production_orders WHERE id = ? AND tenant_id = ?'
    ).bind(orderId, tenantId).first();

    if (!order) {
      return c.json({ success: false, error: 'Production order not found' }, 404);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO production_tasks
       (id, tenant_id, production_order_id, task_name, station_id, assigned_to, status, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)`
    ).bind(
      id, tenantId, orderId, body.taskName, body.stationId ?? null,
      body.assignedTo ?? null, body.notes ?? null, user.sub, now, now
    ).run();

    return c.json({
      success: true,
      data: {
        id,
        tenant_id: tenantId,
        production_order_id: orderId,
        task_name: body.taskName,
        station_id: body.stationId ?? null,
        assigned_to: body.assignedTo ?? null,
        status: 'PENDING',
        start_time: null,
        end_time: null,
        notes: body.notes ?? null,
        created_by: user.sub,
        created_at: now,
        updated_at: now,
      },
    }, 201);
  }
);

/**
 * PATCH /api/production/mgmt/orders/:orderId/tasks/:id
 * Update task status — start or complete a task.
 * RBAC: FLOOR_SUPERVISOR and above
 */
productionMgmtRouter.patch(
  '/orders/:orderId/tasks/:id',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN', 'PRODUCTION_MANAGER', 'FLOOR_SUPERVISOR']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const { orderId, id } = c.req.param();
    const body = await c.req.json<{
      status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
      assignedTo?: string;
      stationId?: string;
      notes?: string;
    }>();

    const task = await c.env.DB.prepare(
      'SELECT * FROM production_tasks WHERE id = ? AND production_order_id = ? AND tenant_id = ?'
    ).bind(id, orderId, tenantId).first<{ status: string; start_time: string | null }>();

    if (!task) {
      return c.json({ success: false, error: 'Task not found' }, 404);
    }

    const now = new Date().toISOString();
    const updates: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (body.status) {
      updates.push('status = ?');
      values.push(body.status);
      // Auto-set start_time when task moves to IN_PROGRESS
      if (body.status === 'IN_PROGRESS' && !task.start_time) {
        updates.push('start_time = ?');
        values.push(now);
      }
      // Auto-set end_time when task is COMPLETED
      if (body.status === 'COMPLETED') {
        updates.push('end_time = ?');
        values.push(now);
      }
    }
    if (body.assignedTo !== undefined) { updates.push('assigned_to = ?'); values.push(body.assignedTo ?? null); }
    if (body.stationId !== undefined) { updates.push('station_id = ?'); values.push(body.stationId ?? null); }
    if (body.notes !== undefined) { updates.push('notes = ?'); values.push(body.notes ?? null); }

    values.push(id, tenantId);

    await c.env.DB.prepare(
      `UPDATE production_tasks SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`
    ).bind(...values).run();

    const updated = await c.env.DB.prepare(
      'SELECT * FROM production_tasks WHERE id = ?'
    ).bind(id).first();

    return c.json({ success: true, data: updated });
  }
);

/**
 * GET /api/production/mgmt/tasks
 * List all tasks across all orders for the tenant (floor supervisor dashboard view).
 * RBAC: FLOOR_SUPERVISOR and above
 */
productionMgmtRouter.get(
  '/tasks',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN', 'PRODUCTION_MANAGER', 'FLOOR_SUPERVISOR']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const statusFilter = c.req.query('status');
    const assignedTo = c.req.query('assignedTo');

    let query = 'SELECT t.*, o.order_number, o.product_name FROM production_tasks t JOIN production_orders o ON t.production_order_id = o.id WHERE t.tenant_id = ?';
    const values: (string | number)[] = [tenantId];

    if (statusFilter) { query += ' AND t.status = ?'; values.push(statusFilter); }
    if (assignedTo) { query += ' AND t.assigned_to = ?'; values.push(assignedTo); }
    query += ' ORDER BY t.created_at DESC LIMIT 100';

    const { results } = await c.env.DB.prepare(query).bind(...values).all();

    return c.json({ success: true, data: results });
  }
);
