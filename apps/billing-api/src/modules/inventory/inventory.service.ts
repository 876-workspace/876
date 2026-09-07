import type {
  InventoryAdjustment,
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

export const inventoryService = {
  adjust,
  consume,
  restore,
}
