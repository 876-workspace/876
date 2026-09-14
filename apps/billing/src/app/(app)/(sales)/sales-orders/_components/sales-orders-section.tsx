'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'

import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'

const options = [
  { value: 'all', label: 'All orders', headingLabel: 'All Sales Orders' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Sales Orders' },
  {
    value: 'confirmed',
    label: 'Confirmed',
    headingLabel: 'Confirmed Sales Orders',
  },
  {
    value: 'completed',
    label: 'Completed',
    headingLabel: 'Completed Sales Orders',
  },
  {
    value: 'canceled',
    label: 'Canceled',
    headingLabel: 'Canceled Sales Orders',
  },
]
const statuses = new Set(options.map((option) => option.value))

export function SalesOrdersSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  const requested = useSearchParams().get('status') ?? 'all'
  const status = statuses.has(requested) ? requested : 'all'
  return (
    <ListDetailSection
      toolbar={
        <StreamingResourceToolbar
          title="Sales Orders"
          status={status}
          options={options}
          primary={{
            href: '/sales-orders/new',
            permission: 'sales-orders:write',
          }}
        />
      }
      list={list}
      takeoverSegments={['new', 'edit']}
    >
      {children}
    </ListDetailSection>
  )
}
