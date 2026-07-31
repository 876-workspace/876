import type { Address, Warehouse } from '@/lib/db'
import type { WarehouseView } from '@/types/warehouse'

/**
 * Every warehouse read includes its address in one relation query — a warehouse
 * list must never issue an address query per row.
 */
export const WAREHOUSE_WITH_ADDRESS = { include: { address: true } } as const

export type WarehouseWithAddress = Warehouse & { address: Address }

export function toWarehouseView(
  warehouse: WarehouseWithAddress
): WarehouseView {
  const { address, ...rest } = warehouse

  return { ...rest, addressId: address.id, address }
}
