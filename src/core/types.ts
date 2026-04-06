/**
 * WebWaka Production Suite — Shared Types & Constants
 * Blueprint Reference: Part 3.3 — Domain Model
 *
 * Invariant 1: Build Once Use Infinitely
 * All shared types are defined here once and imported across modules.
 * NEVER duplicate type definitions across modules.
 */

// ─── Platform-Wide Types ──────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// ─── Production Domain Types ──────────────────────────────────────────────────
export type ProductionOrderStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type QualityCheckType = 'IN_PROCESS' | 'FINAL' | 'INCOMING';
export type QualityCheckResult = 'PASS' | 'FAIL' | 'PENDING';

export interface ProductionOrder {
  id: string;
  tenantId: string; // ALWAYS from JWT — NEVER from request body or headers
  orderNumber: string;
  productName: string;
  quantity: number;
  unit: string;
  status: ProductionOrderStatus;
  scheduledStartDate: string | null;
  scheduledEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillOfMaterial {
  id: string;
  tenantId: string;
  productionOrderId: string;
  componentName: string;
  componentSku: string | null;
  quantityRequired: number;
  unit: string;
  quantityUsed: number | null;
  createdAt: string;
}

export interface QualityCheck {
  id: string;
  tenantId: string;
  productionOrderId: string;
  checkType: QualityCheckType;
  result: QualityCheckResult;
  checkedBy: string | null;
  notes: string | null;
  checkedAt: string | null;
  createdAt: string;
}

export type ProductionTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export interface ProductionTask {
  id: string;
  tenantId: string;
  productionOrderId: string;
  taskName: string;
  stationId: string | null;
  assignedTo: string | null;
  status: ProductionTaskStatus;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
export const PRODUCTION_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  ORDER_NUMBER_PREFIX: 'PO',
  VERTICAL: 'production',
  VERSION: '1.0.0',
} as const;

// ─── Cloudflare D1 Bindings (re-exported for module use) ─────────────────────
export interface ProductionBindings {
  DB: D1Database;
  SESSIONS_KV: KVNamespace;
  RATE_LIMIT_KV: KVNamespace;
  JWT_SECRET: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  OPENROUTER_API_KEY?: string;
  PAYSTACK_SECRET_KEY?: string;
}
