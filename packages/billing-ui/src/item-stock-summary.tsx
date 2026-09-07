import type { ReactNode } from 'react'

import {
  getItemStockStatus,
  itemStockStatusLabel,
  type ItemStockState,
} from './item-stock'

export interface ItemStockSummaryProps extends ItemStockState {
  allowOutOfStock: boolean
  action?: ReactNode
}

/** Shared lightweight stock facts for Billing and Invoice Item records. */
export function ItemStockSummary({
  type,
  trackStock,
  stockQuantity,
  lowStockThreshold,
  allowOutOfStock,
  action,
}: ItemStockSummaryProps) {
  const status = getItemStockStatus({
    type,
    trackStock,
    stockQuantity,
    lowStockThreshold,
  })

  return (
    <div className="space-y-4">
      {action ? <div className="flex justify-end">{action}</div> : null}
      <dl className="grid gap-3 sm:grid-cols-2">
        <Fact
          label="Quantity"
          value={status === 'not-tracked' ? '—' : String(stockQuantity ?? 0)}
        />
        <Fact label="Status" value={itemStockStatusLabel(status)} />
        <Fact
          label="Low stock threshold"
          value={
            status === 'not-tracked' || lowStockThreshold === null
              ? '—'
              : String(lowStockThreshold)
          }
        />
        <Fact
          label="Out-of-stock sales"
          value={
            status === 'not-tracked'
              ? '—'
              : allowOutOfStock
                ? 'Allowed'
                : 'Not allowed'
          }
        />
      </dl>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 text-sm font-medium tabular-nums">{value}</dd>
    </div>
  )
}
