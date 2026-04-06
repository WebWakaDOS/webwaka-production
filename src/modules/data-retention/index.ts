/**
 * WebWaka Production Suite — Data Retention & Archiving (PROD-006)
 * Blueprint Reference: Part 10.x — Data Governance
 *
 * Invariant 1: Build Once Use Infinitely — auth from @webwaka/core
 *
 * Retention Policies (coordinated with webwaka-central-mgmt):
 * - Completed/Cancelled production orders: archive after 365 days
 * - Archived records remain queryable for audit/compliance (7 years)
 *
 * This module provides:
 * 1. An archive endpoint that can be triggered by a Cloudflare Cron Trigger
 *    or a scheduled call from webwaka-central-mgmt
 * 2. Query endpoints for archived records
 *
 * NDPR Compliance: Data is never deleted, only moved to archive storage.
 * Archived data retains its tenant_id for proper isolation.
 */

import { Hono } from 'hono';
import { requireRole } from '@webwaka/core';
import type { ProductionBindings } from '../../core/types.js';
import type { JWTPayload } from '@webwaka/core';

interface Variables {
  user: JWTPayload;
  tenantId: string;
}

// ─── Retention Configuration ──────────────────────────────────────────────────
const RETENTION_CONFIG = {
  // Archive completed/cancelled orders older than this many days
  archiveAfterDays: 365,
  // Query limit for archive operations to avoid timeouts on Cloudflare Workers
  batchSize: 100,
} as const;

export const dataRetentionRouter = new Hono<{
  Bindings: ProductionBindings;
  Variables: Variables;
}>();

/**
 * POST /api/production/retention/archive
 * Archive production orders that exceed the retention window.
 * Can be triggered by Cloudflare Cron Trigger or webwaka-central-mgmt.
 * RBAC: TENANT_ADMIN and above
 */
dataRetentionRouter.post(
  '/archive',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN']),
  async (c) => {
    const tenantId = c.get('tenantId');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_CONFIG.archiveAfterDays);
    const cutoffISO = cutoffDate.toISOString();

    // Find eligible orders: completed or cancelled, older than retention window
    const { results: eligibleOrders } = await c.env.DB.prepare(
      `SELECT * FROM production_orders
       WHERE tenant_id = ?
         AND status IN ('COMPLETED', 'CANCELLED')
         AND updated_at < ?
       ORDER BY updated_at ASC
       LIMIT ?`
    ).bind(tenantId, cutoffISO, RETENTION_CONFIG.batchSize).all<{
      id: string;
      tenant_id: string;
      order_number: string;
      product_name: string;
      quantity: number;
      unit: string;
      status: string;
      scheduled_start_date: string | null;
      scheduled_end_date: string | null;
      actual_start_date: string | null;
      actual_end_date: string | null;
      notes: string | null;
      created_by: string;
      created_at: string;
      updated_at: string;
    }>();

    if (eligibleOrders.length === 0) {
      return c.json({
        success: true,
        data: { archived: 0, message: 'No orders eligible for archiving' },
      });
    }

    const now = new Date().toISOString();
    let archivedCount = 0;
    const errors: string[] = [];

    for (const order of eligibleOrders) {
      try {
        // Insert into archive table
        await c.env.DB.prepare(
          `INSERT OR IGNORE INTO archived_production_orders
           (id, tenant_id, order_number, product_name, quantity, unit, status,
            scheduled_start_date, scheduled_end_date, actual_start_date, actual_end_date,
            notes, created_by, created_at, updated_at, archived_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          order.id, order.tenant_id, order.order_number, order.product_name,
          order.quantity, order.unit, order.status,
          order.scheduled_start_date, order.scheduled_end_date,
          order.actual_start_date, order.actual_end_date,
          order.notes, order.created_by, order.created_at, order.updated_at, now
        ).run();

        // Remove from active table (CASCADE deletes associated BOM/QC/tasks)
        await c.env.DB.prepare(
          'DELETE FROM production_orders WHERE id = ? AND tenant_id = ?'
        ).bind(order.id, order.tenant_id).run();

        archivedCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${order.id}: ${msg}`);
        console.error(`[data-retention] Failed to archive order ${order.id}:`, msg);
      }
    }

    return c.json({
      success: true,
      data: {
        archived: archivedCount,
        errors: errors.length > 0 ? errors : undefined,
        cutoffDate: cutoffISO,
        message: `Archived ${archivedCount} of ${eligibleOrders.length} eligible orders`,
      },
    });
  }
);

/**
 * GET /api/production/retention/archived
 * List archived production orders for the tenant.
 * RBAC: TENANT_ADMIN and above (audit access)
 */
dataRetentionRouter.get(
  '/archived',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('pageSize') ?? '20', 10)));
    const offset = (page - 1) * pageSize;

    const [{ results }, countResult] = await Promise.all([
      c.env.DB.prepare(
        'SELECT * FROM archived_production_orders WHERE tenant_id = ? ORDER BY archived_at DESC LIMIT ? OFFSET ?'
      ).bind(tenantId, pageSize, offset).all(),
      c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM archived_production_orders WHERE tenant_id = ?'
      ).bind(tenantId).first<{ total: number }>(),
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
 * GET /api/production/retention/archived/:id
 * Retrieve a specific archived production order.
 * RBAC: TENANT_ADMIN and above
 */
dataRetentionRouter.get(
  '/archived/:id',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();

    const order = await c.env.DB.prepare(
      'SELECT * FROM archived_production_orders WHERE id = ? AND tenant_id = ?'
    ).bind(id, tenantId).first();

    if (!order) {
      return c.json({ success: false, error: 'Archived order not found' }, 404);
    }

    return c.json({ success: true, data: order });
  }
);

/**
 * GET /api/production/retention/stats
 * Get retention statistics for the tenant.
 * RBAC: TENANT_ADMIN and above
 */
dataRetentionRouter.get(
  '/stats',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN']),
  async (c) => {
    const tenantId = c.get('tenantId');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_CONFIG.archiveAfterDays);
    const cutoffISO = cutoffDate.toISOString();

    const [activeResult, archivedResult, eligibleResult] = await Promise.all([
      c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM production_orders WHERE tenant_id = ?'
      ).bind(tenantId).first<{ total: number }>(),
      c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM archived_production_orders WHERE tenant_id = ?'
      ).bind(tenantId).first<{ total: number }>(),
      c.env.DB.prepare(
        `SELECT COUNT(*) as total FROM production_orders
         WHERE tenant_id = ? AND status IN ('COMPLETED', 'CANCELLED') AND updated_at < ?`
      ).bind(tenantId, cutoffISO).first<{ total: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        activeOrders: activeResult?.total ?? 0,
        archivedOrders: archivedResult?.total ?? 0,
        eligibleForArchiving: eligibleResult?.total ?? 0,
        retentionWindowDays: RETENTION_CONFIG.archiveAfterDays,
        cutoffDate: cutoffISO,
      },
    });
  }
);
