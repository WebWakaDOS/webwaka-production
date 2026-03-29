/**
 * WebWaka Production Suite — Auth Middleware
 * Blueprint Reference: Part 6.1 — Authentication & Authorization
 *
 * Invariant 1: Build Once Use Infinitely
 * ALL auth primitives are imported from @webwaka/core.
 * NEVER re-implement validateJWT, requireRole, rateLimit, or secureCORS here.
 * This file exists solely as a vertical-local re-export for convenience
 * and to document which primitives this vertical uses.
 */

// Re-export canonical auth primitives from @webwaka/core
// Invariant 1: Build Once Use Infinitely — single source of truth
export {
  validateJWT,
  jwtAuthMiddleware,
  requireRole,
  secureCORS,
  rateLimit,
  signJWT,
  type JWTPayload,
  type AuthConfig,
} from '@webwaka/core';

/**
 * Production-vertical-specific role constants.
 * These map to the RBAC roles defined in the super-admin-v2 RBAC schema.
 * Blueprint Reference: Part 6.2 — Role-Based Access Control
 */
export const PRODUCTION_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  PRODUCTION_MANAGER: 'PRODUCTION_MANAGER',
  FLOOR_SUPERVISOR: 'FLOOR_SUPERVISOR',
  QC_INSPECTOR: 'QC_INSPECTOR',
  WAREHOUSE_STAFF: 'WAREHOUSE_STAFF',
  VIEWER: 'VIEWER',
} as const;

export type ProductionRole = (typeof PRODUCTION_ROLES)[keyof typeof PRODUCTION_ROLES];
