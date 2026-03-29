/**
 * WebWaka Production Suite — Dexie Offline Database
 * Blueprint Reference: Part 4.2 — Offline-First Architecture
 *
 * Invariant 4: Offline First
 * All data is stored locally in IndexedDB via Dexie before syncing to D1.
 * The mutation queue ensures zero data loss during network outages.
 *
 * Invariant 2: Mobile First
 * IndexedDB is the only reliable offline storage on mobile browsers.
 * Dexie provides a clean, Promise-based API over the raw IndexedDB API.
 *
 * Sync Strategy:
 * 1. All writes go to Dexie first (optimistic local update)
 * 2. A background sync worker pushes queued mutations to the Cloudflare Worker API
 * 3. Conflicts are resolved server-side (last-write-wins per tenant)
 */

import Dexie, { type Table } from 'dexie';

// ─── Offline Table Interfaces ─────────────────────────────────────────────────
// These mirror the D1 schema in migrations/001_production_schema.sql

export interface OfflineProductionOrder {
  id: string;
  tenantId: string;
  orderNumber: string;
  productName: string;
  quantity: number;
  unit: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledStartDate: string | null;
  scheduledEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  synced: 0 | 1; // 0 = pending sync, 1 = synced
}

export interface OfflineBillOfMaterial {
  id: string;
  tenantId: string;
  productionOrderId: string;
  componentName: string;
  componentSku: string | null;
  quantityRequired: number;
  unit: string;
  quantityUsed: number | null;
  createdAt: string;
  synced: 0 | 1;
}

export interface OfflineQualityCheck {
  id: string;
  tenantId: string;
  productionOrderId: string;
  checkType: 'IN_PROCESS' | 'FINAL' | 'INCOMING';
  result: 'PASS' | 'FAIL' | 'PENDING';
  checkedBy: string | null;
  notes: string | null;
  checkedAt: string | null;
  createdAt: string;
  synced: 0 | 1;
}

// ─── Mutation Queue (Invariant 4: Offline First) ──────────────────────────────
export interface MutationQueueItem {
  id?: number; // Auto-incremented by Dexie
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  resource: 'production_order' | 'bill_of_material' | 'quality_check';
  resourceId: string;
  payload: string; // JSON stringified
  retryCount: number;
  synced: 0 | 1;
  createdAt: string;
}

// ─── Dexie Database Class ─────────────────────────────────────────────────────
class WebWakaProductionDB extends Dexie {
  productionOrders!: Table<OfflineProductionOrder, string>;
  billsOfMaterial!: Table<OfflineBillOfMaterial, string>;
  qualityChecks!: Table<OfflineQualityCheck, string>;
  mutationQueue!: Table<MutationQueueItem, number>;

  constructor() {
    super('webwaka-production-db');

    // Schema version 1 — matches migrations/001_production_schema.sql
    this.version(1).stores({
      productionOrders: 'id, tenantId, orderNumber, status, synced, createdAt',
      billsOfMaterial: 'id, tenantId, productionOrderId, synced',
      qualityChecks: 'id, tenantId, productionOrderId, result, synced',
      mutationQueue: '++id, operation, resource, resourceId, synced, createdAt',
    });
  }
}

// Singleton instance — one DB per browser tab
export const db = new WebWakaProductionDB();

// ─── Sync Queue Hook (to be used in React components) ────────────────────────
/**
 * Returns all unsynced mutations from the queue.
 * The background sync worker calls this and POSTs each item to the API.
 * Blueprint Reference: Part 4.2 — Sync Strategy
 */
export async function getPendingMutations(): Promise<MutationQueueItem[]> {
  return db.mutationQueue.where('synced').equals(0).toArray();
}

export async function markMutationSynced(id: number): Promise<void> {
  await db.mutationQueue.update(id, { synced: 1 });
}

export async function enqueueMutation(
  item: Omit<MutationQueueItem, 'id' | 'synced' | 'retryCount' | 'createdAt'>
): Promise<void> {
  await db.mutationQueue.add({
    ...item,
    retryCount: 0,
    synced: 0,
    createdAt: new Date().toISOString(),
  });
}
