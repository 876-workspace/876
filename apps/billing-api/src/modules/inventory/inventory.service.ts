import type {
  InventoryAdjustment,
  InventoryLine,
  InventoryMutation,
  InventoryRestore,
} from '@/types/inventory'

import * as repository from './inventory.repository'

type InventoryTransaction = Parameters<typeof repository.consume>[0]

export function consume(
  tx: InventoryTransaction,
  tenantId: string,
  params: InventoryMutation
) {
  return repository.consume(tx, tenantId, params)
}

export function restore(
  tx: InventoryTransaction,
  tenantId: string,
  params: InventoryRestore
) {
  return repository.restore(tx, tenantId, params)
}

export function adjust(tenantId: string, params: InventoryAdjustment) {
  return repository.adjust(tenantId, params)
}

/**
 * Runs the same authoritative availability resolution used by consumption but
 * does not mutate stock. This is advisory; callers that mutate must still call
 * `consume` inside their transaction.
 */
export function checkAvailability(
  tenantId: string,
  lines: readonly InventoryLine[]
) {
  return repository.checkAvailability(tenantId, lines)
}

export const inventoryService = {
  adjust,
  checkAvailability,
  consume,
  restore,
}
