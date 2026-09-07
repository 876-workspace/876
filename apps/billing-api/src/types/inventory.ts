import type { ResourceReference, StockTarget } from './commerce'

export interface InventoryLine {
  target: StockTarget
  quantity: number
}

export interface InventoryAdjustment {
  target: StockTarget
  quantity: number
  note?: string | null
  createdBy?: string
}

export interface InventoryMutation {
  reference: ResourceReference
  reason: 'sale'
  lines: readonly InventoryLine[]
  occurredAt: number
}

export interface InventoryRestore {
  reference: ResourceReference
  reason: 'sale'
  occurredAt: number
}
