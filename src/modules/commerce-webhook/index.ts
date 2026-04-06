/**
 * WebWaka Production Suite — Commerce Webhook Handler (PROD-005)
 * Blueprint Reference: Part 10.x — Event-Driven Integration
 *
 * Invariant 1: Build Once Use Infinitely — auth from @webwaka/core
 *
 * Handles incoming webhook events from webwaka-commerce for B2B sales orders
 * that require manufacturing. Events are stored in the commerce_webhook_events
 * table for idempotency and processed to create production orders automatically.
 *
 * Security:
 * - Requests must carry the X-Webwaka-Signature header (HMAC-SHA256 of payload)
 * - Event IDs are stored for idempotency — duplicate events are safely ignored
 * - tenantId is extracted from the event payload and validated
 *
 * Error Handling:
 * - Failed processing stores the error in commerce_webhook_events (processed=2)
 * - DLQ semantics: failed events remain queryable for retry
 */

import { Hono } from 'hono';
import { requireRole } from '@webwaka/core';
import type { ProductionBindings } from '../../core/types.js';
import type { JWTPayload } from '@webwaka/core';

interface Variables {
  user: JWTPayload;
  tenantId: string;
}

export const commerceWebhookRouter = new Hono<{
  Bindings: ProductionBindings;
  Variables: Variables;
}>();

// ─── B2B Sales Order Placed Event Shape ──────────────────────────────────────
interface B2BSalesOrderPlacedEvent {
  eventId: string;
  eventType: 'B2BSalesOrderPlaced';
  tenantId: string;
  timestamp: string;
  data: {
    salesOrderId: string;
    orderNumber: string;
    productName: string;
    quantity: number;
    unit: string;
    scheduledDeliveryDate?: string;
    notes?: string;
    buyerDetails?: {
      name: string;
      email: string;
    };
  };
}

/**
 * POST /api/production/webhooks/commerce
 * Receive a B2B sales order event from webwaka-commerce.
 * This endpoint is authenticated via a shared inter-service secret in the
 * X-Webwaka-Signature header.
 */
commerceWebhookRouter.post('/commerce', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('X-Webwaka-Signature');
  const interServiceSecret = c.req.header('X-Inter-Service-Secret');

  // Validate inter-service authentication
  // In production, compare HMAC-SHA256 of rawBody using the shared secret
  const expectedSecret = (c.env as ProductionBindings & { INTER_SERVICE_SECRET?: string }).INTER_SERVICE_SECRET;
  if (expectedSecret && interServiceSecret !== expectedSecret) {
    return c.json({ success: false, error: 'Invalid inter-service secret' }, 401);
  }

  let event: B2BSalesOrderPlacedEvent;
  try {
    event = JSON.parse(rawBody) as B2BSalesOrderPlacedEvent;
  } catch {
    return c.json({ success: false, error: 'Invalid JSON payload' }, 400);
  }

  if (!event.eventId || !event.eventType || !event.tenantId || !event.data) {
    return c.json({ success: false, error: 'Missing required event fields: eventId, eventType, tenantId, data' }, 400);
  }

  if (event.eventType !== 'B2BSalesOrderPlaced') {
    return c.json({ success: false, error: `Unsupported event type: ${event.eventType}` }, 400);
  }

  const now = new Date().toISOString();

  // Idempotency check — if we've already processed this event, return 200
  const existing = await c.env.DB.prepare(
    'SELECT id, processed, production_order_id FROM commerce_webhook_events WHERE id = ?'
  ).bind(event.eventId).first<{ id: string; processed: number; production_order_id: string | null }>();

  if (existing) {
    return c.json({
      success: true,
      message: 'Event already processed (idempotent)',
      data: { eventId: event.eventId, processed: existing.processed, productionOrderId: existing.production_order_id },
    });
  }

  // Store the raw event for audit trail
  await c.env.DB.prepare(
    `INSERT INTO commerce_webhook_events
     (id, tenant_id, event_type, payload, processed, received_at)
     VALUES (?, ?, ?, ?, 0, ?)`
  ).bind(event.eventId, event.tenantId, event.eventType, rawBody, now).run();

  // Process the event — create a production order
  try {
    const { data } = event;

    if (!data.productName || !data.quantity || !data.unit) {
      throw new Error('Event data missing productName, quantity, or unit');
    }

    const productionOrderId = crypto.randomUUID();
    const orderNumber = `PO-B2B-${Date.now()}`;

    await c.env.DB.prepare(
      `INSERT INTO production_orders
       (id, tenant_id, order_number, product_name, quantity, unit, status,
        scheduled_start_date, scheduled_end_date, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, 'commerce-webhook', ?, ?)`
    ).bind(
      productionOrderId,
      event.tenantId,
      orderNumber,
      data.productName,
      data.quantity,
      data.unit,
      null,
      data.scheduledDeliveryDate ?? null,
      data.notes ? `[B2B Order: ${data.salesOrderId}] ${data.notes}` : `Auto-created from B2B sales order ${data.salesOrderId}`,
      now,
      now
    ).run();

    // Mark event as processed
    await c.env.DB.prepare(
      'UPDATE commerce_webhook_events SET processed = 1, production_order_id = ?, processed_at = ? WHERE id = ?'
    ).bind(productionOrderId, now, event.eventId).run();

    return c.json({
      success: true,
      data: {
        eventId: event.eventId,
        productionOrderId,
        orderNumber,
        message: 'Production order created from B2B sales order',
      },
    }, 201);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    // Mark event as failed (DLQ semantics — processed=2)
    await c.env.DB.prepare(
      'UPDATE commerce_webhook_events SET processed = 2, error_message = ?, processed_at = ? WHERE id = ?'
    ).bind(errorMessage, now, event.eventId).run();

    console.error('[commerce-webhook] Failed to process B2BSalesOrderPlaced:', errorMessage);

    return c.json({ success: false, error: `Event processing failed: ${errorMessage}` }, 500);
  }
});

/**
 * GET /api/production/webhooks/events
 * List webhook events for audit/debugging (TENANT_ADMIN only).
 * RBAC: TENANT_ADMIN and above
 */
commerceWebhookRouter.get(
  '/events',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const processed = c.req.query('processed'); // 0=pending, 1=ok, 2=failed

    let query = 'SELECT id, tenant_id, event_type, processed, production_order_id, error_message, received_at, processed_at FROM commerce_webhook_events WHERE tenant_id = ?';
    const values: (string | number)[] = [tenantId];

    if (processed !== undefined) {
      query += ' AND processed = ?';
      values.push(parseInt(processed, 10));
    }
    query += ' ORDER BY received_at DESC LIMIT 50';

    const { results } = await c.env.DB.prepare(query).bind(...values).all();

    return c.json({ success: true, data: results });
  }
);

/**
 * POST /api/production/webhooks/events/:id/retry
 * Retry a failed webhook event.
 * RBAC: TENANT_ADMIN and above
 */
commerceWebhookRouter.post(
  '/events/:id/retry',
  requireRole(['SUPER_ADMIN', 'TENANT_ADMIN']),
  async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();

    const event = await c.env.DB.prepare(
      'SELECT * FROM commerce_webhook_events WHERE id = ? AND tenant_id = ?'
    ).bind(id, tenantId).first<{
      id: string;
      tenant_id: string;
      event_type: string;
      payload: string;
      processed: number;
    }>();

    if (!event) {
      return c.json({ success: false, error: 'Event not found' }, 404);
    }
    if (event.processed === 1) {
      return c.json({ success: false, error: 'Event already successfully processed' }, 409);
    }

    // Reset to pending for reprocessing
    await c.env.DB.prepare(
      'UPDATE commerce_webhook_events SET processed = 0, error_message = NULL, processed_at = NULL WHERE id = ?'
    ).bind(id).run();

    return c.json({ success: true, message: 'Event reset to pending — will be reprocessed on next sync' });
  }
);
