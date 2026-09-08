export type ItemStockStatus =
  'not-tracked' | 'in-stock' | 'low-stock' | 'out-of-stock'

export interface ItemStockState {
  type: string
  /** Absent when the caller's read exposes no inventory state. */
  trackStock?: boolean
  stockQuantity?: number | null
  lowStockThreshold?: number | null
}

/** Resolves presentation state from the live Item stock counter. */
export function getItemStockStatus(item: ItemStockState): ItemStockStatus {
  if (item.type !== 'GOOD' || !item.trackStock) return 'not-tracked'

  const quantity = item.stockQuantity ?? 0
  if (quantity <= 0) return 'out-of-stock'
  if (
    item.lowStockThreshold !== null &&
    item.lowStockThreshold !== undefined &&
    quantity <= item.lowStockThreshold
  )
    return 'low-stock'

  return 'in-stock'
}

export function formatItemStock(item: ItemStockState): string {
  const status = getItemStockStatus(item)
  if (status === 'not-tracked') return '—'

  const quantity = item.stockQuantity ?? 0
  if (status === 'out-of-stock') return `Out · ${quantity}`
  if (status === 'low-stock') return `Low · ${quantity}`
  return String(quantity)
}

export function itemStockStatusLabel(status: ItemStockStatus): string {
  switch (status) {
    case 'not-tracked':
      return 'Not tracked'
    case 'in-stock':
      return 'In stock'
    case 'low-stock':
      return 'Low stock'
    case 'out-of-stock':
      return 'Out of stock'
  }
}
