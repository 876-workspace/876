import type { InventoryResult } from '@/types/inventory'

export function inventoryOk<T>(data: T): InventoryResult<T> {
  return { data, error: null }
}

export function inventoryErr(
  error: string,
  status?: number,
  code?: string
): InventoryResult<never> {
  return {
    data: null,
    error,
    ...(status === undefined ? {} : { status }),
    ...(code === undefined ? {} : { code }),
  }
}
