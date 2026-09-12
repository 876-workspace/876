'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'

import { ListDetailShell, useListDetailRoute } from '@876/ui/list-detail-shell'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

const REQUEST_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All requests' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'WAITING', label: 'Waiting' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

/** Persistent request-section split view; hosts provide route-aware content. */
export function RequestListDetailShell({
  list,
  children,
  baseHref,
  canCreate = true,
}: {
  list: ReactNode
  children: ReactNode
  baseHref: string
  canCreate?: boolean
}) {
  const { open } = useListDetailRoute(['new'])
  const status = useSearchParams().get('status') ?? 'all'
  return (
    <ListDetailShell
      open={open}
      toolbar={
        <ResourceToolbar
          title="Requests"
          titleFilter={
            <StatusFilterHeading
              label="Requests"
              value={status}
              options={REQUEST_STATUS_OPTIONS}
              basePath={baseHref}
            />
          }
          primaryLabel={canCreate ? 'Add' : undefined}
          primaryHref={canCreate ? `${baseHref}/new` : undefined}
          primaryVariant="info"
          refresh
          dropdownActions={[{ label: 'Export', icon: 'export' }]}
        />
      }
      list={list}
      detail={children}
      className="h-full min-h-0"
    />
  )
}
