'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from '@876/ui/list-pane'
import { useDetailSegments } from '@876/ui/list-detail-shell'

import type { PlanRow } from '@/features/catalog/components/plans-table'
import { PlansTable } from '@/features/catalog/components/plans-table'
import { parseCatalogStatus } from '../../_components/catalog-list-config'

type Props = {
  plans: PlanRow[]
  emptyState?: ReactNode
}

export function PlansList({ plans, emptyState }: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  const status = parseCatalogStatus(searchParams.get('status') ?? undefined)
  // The status filter is applied here rather than in the query because a
  // layout receives no `searchParams`, and the list has to live in the layout
  // to survive opening a record. The underlying call already returns the
  // tenant's whole resource set, so this narrows what was fetched either way.
  const filterStatus = status === 'all' ? undefined : status === 'active'
  const rows =
    filterStatus === undefined
      ? plans
      : plans.filter((row) => row.isActive === filterStatus)

  if (!selectedId) return <PlansTable plans={rows} emptyState={emptyState} />

  return (
    <ListPane>
      <ListPaneHeader>Plans</ListPaneHeader>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No plans yet</ListPaneEmpty>
        ) : (
          rows.map((plan) => (
            <ListPaneItem
              key={plan.id}
              href={query ? `/plans/${plan.id}?${query}` : `/plans/${plan.id}`}
              selected={plan.id === selectedId}
              label={`View plan ${plan.name}`}
              title={plan.name}
              subtitle={plan.code}
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
