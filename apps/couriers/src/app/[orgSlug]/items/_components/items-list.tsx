'use client'

import type { ReactNode } from 'react'
import { ItemsTable, type ItemRow } from '@876/billing-ui/items-table'

import { formatMoney } from '@/lib/finance/format'

type Props = {
  items: ItemRow[]
  orgSlug: string
  emptyState?: ReactNode
}

/**
 * The formatter is a function, so it cannot cross the RSC boundary as a prop;
 * this client adapter binds Couriers' money policy and routes to the shared table.
 */
export function ItemsList({ items, orgSlug, emptyState }: Props) {
  return (
    <ItemsTable
      items={items}
      defaultCurrency="JMD"
      baseHref={`/${orgSlug}/items`}
      formatAmount={formatMoney}
      emptyState={emptyState}
    />
  )
}
