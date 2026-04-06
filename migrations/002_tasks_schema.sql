-- WebWaka Production Suite — Tasks & Archiving Schema
-- Blueprint Reference: Part 10.x — PROD-004, PROD-006
-- Migration: 002_tasks_schema
-- Created: 2026-04-06
--
-- Invariant: Multi-Tenant Isolation
-- EVERY table has tenant_id as the FIRST column after id.

-- ─── Production Tasks (Floor Supervision — PROD-004) ─────────────────────────
CREATE TABLE IF NOT EXISTS mfgp_production_tasks (
  id                   TEXT PRIMARY KEY NOT NULL,
  tenant_id            TEXT NOT NULL,
  production_order_id  TEXT NOT NULL REFERENCES mfgp_production_orders(id) ON DELETE CASCADE,
  task_name            TEXT NOT NULL,
  station_id           TEXT,
  assigned_to          TEXT,                    -- user_id from JWT sub claim
  status               TEXT NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED')),
  start_time           TEXT,                    -- ISO 8601
  end_time             TEXT,
  notes                TEXT,
  created_by           TEXT NOT NULL,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_production_tasks_tenant_order
  ON mfgp_production_tasks (tenant_id, production_order_id);

CREATE INDEX IF NOT EXISTS idx_production_tasks_status
  ON mfgp_production_tasks (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_production_tasks_assigned
  ON mfgp_production_tasks (tenant_id, assigned_to);

-- ─── Archived Production Orders (Data Retention — PROD-006) ──────────────────
-- Archived orders are moved here when older than the retention window.
-- They remain queryable for audit purposes.
CREATE TABLE IF NOT EXISTS mfgp_archived_production_orders (
  id                   TEXT PRIMARY KEY NOT NULL,
  tenant_id            TEXT NOT NULL,
  order_number         TEXT NOT NULL,
  product_name         TEXT NOT NULL,
  quantity             REAL NOT NULL,
  unit                 TEXT NOT NULL,
  status               TEXT NOT NULL,
  scheduled_start_date TEXT,
  scheduled_end_date   TEXT,
  actual_start_date    TEXT,
  actual_end_date      TEXT,
  notes                TEXT,
  created_by           TEXT NOT NULL,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL,
  archived_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_archived_orders_tenant
  ON mfgp_archived_production_orders (tenant_id, archived_at DESC);

-- ─── Commerce Webhook Event Log (PROD-005) ────────────────────────────────────
-- Stores incoming B2B sales order events from webwaka-commerce for idempotency.
CREATE TABLE IF NOT EXISTS mfgp_commerce_webhook_events (
  id                   TEXT PRIMARY KEY NOT NULL,  -- event_id from webwaka-commerce
  tenant_id            TEXT NOT NULL,
  event_type           TEXT NOT NULL,              -- e.g., 'B2BSalesOrderPlaced'
  payload              TEXT NOT NULL,              -- JSON
  processed            INTEGER NOT NULL DEFAULT 0, -- 0 = pending, 1 = processed, 2 = failed
  production_order_id  TEXT,                       -- created production order id
  error_message        TEXT,
  received_at          TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at         TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_commerce_events_id
  ON mfgp_commerce_webhook_events (id);

CREATE INDEX IF NOT EXISTS idx_commerce_events_tenant
  ON mfgp_commerce_webhook_events (tenant_id, processed, received_at DESC);
