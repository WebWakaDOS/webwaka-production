-- WebWaka Production Suite — Initial D1 Schema
-- Blueprint Reference: Part 3.2 — Cloudflare D1 Database
-- Migration: 001_production_schema
-- Created: 2026-03-29
--
-- Invariant: Multi-Tenant Isolation
-- EVERY table has tenant_id as the FIRST column after id.
-- EVERY query MUST filter by tenant_id sourced from the JWT payload.
-- NEVER trust tenant_id from request body, query params, or headers.

-- ─── Production Orders ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS production_orders (
  id                   TEXT PRIMARY KEY NOT NULL,
  tenant_id            TEXT NOT NULL,           -- ALWAYS from JWT, NEVER from request
  order_number         TEXT NOT NULL,
  product_name         TEXT NOT NULL,
  quantity             REAL NOT NULL,
  unit                 TEXT NOT NULL,           -- e.g., 'units', 'kg', 'litres', 'metres'
  status               TEXT NOT NULL DEFAULT 'DRAFT'
                         CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  scheduled_start_date TEXT,                    -- ISO 8601 date string
  scheduled_end_date   TEXT,
  actual_start_date    TEXT,
  actual_end_date      TEXT,
  notes                TEXT,
  created_by           TEXT NOT NULL,           -- user_id from JWT sub claim
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for tenant-scoped queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_production_orders_tenant_id
  ON production_orders (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_production_orders_status
  ON production_orders (tenant_id, status);

-- ─── Bill of Materials ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bill_of_materials (
  id                   TEXT PRIMARY KEY NOT NULL,
  tenant_id            TEXT NOT NULL,
  production_order_id  TEXT NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  component_name       TEXT NOT NULL,
  component_sku        TEXT,
  quantity_required    REAL NOT NULL,
  unit                 TEXT NOT NULL,
  quantity_used        REAL,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bom_tenant_order
  ON bill_of_materials (tenant_id, production_order_id);

-- ─── Quality Checks ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quality_checks (
  id                   TEXT PRIMARY KEY NOT NULL,
  tenant_id            TEXT NOT NULL,
  production_order_id  TEXT NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  check_type           TEXT NOT NULL
                         CHECK (check_type IN ('IN_PROCESS', 'FINAL', 'INCOMING')),
  result               TEXT NOT NULL DEFAULT 'PENDING'
                         CHECK (result IN ('PASS', 'FAIL', 'PENDING')),
  checked_by           TEXT,                    -- user_id from JWT sub claim
  notes                TEXT,
  checked_at           TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_quality_checks_tenant_order
  ON quality_checks (tenant_id, production_order_id);

CREATE INDEX IF NOT EXISTS idx_quality_checks_result
  ON quality_checks (tenant_id, result);
