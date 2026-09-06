'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailShell, useListDetailRoute } from '@876/ui/list-detail-shell'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

export const TEAM_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Users' },
  { value: 'active', label: 'Active', headingLabel: 'Active Users' },
  { value: 'suspended', label: 'Suspended', headingLabel: 'Suspended Users' },
  { value: 'expired', label: 'Expired', headingLabel: 'Expired Users' },
]

type Props = {
  /** The member list — a table when closed, a condensed list when open. */
  list: ReactNode
  /** The member card: whatever route is active under `/settings/users`. */
  children: ReactNode
}

/**
 * The persistent frame for every `/settings/users` route.
 *
 * Selecting a member narrows the existing list column and opens the member
 * route beside it, rather than replacing the list with a separate page tree.
 */
export function TeamShell({ list, children }: Props) {
  const { open } = useListDetailRoute()
  const searchParams = useSearchParams()
  const status = searchParams.get('status') ?? 'all'
  const query = searchParams.toString()
  const newHref = query ? `/settings/users/new?${query}` : '/settings/users/new'

  return (
    <Page className={open ? 'h-full min-h-0' : 'min-h-full'}>
      <ListDetailShell
        open={open}
        toolbar={
          <ResourceToolbar
            title="Users"
            titleFilter={
              <StatusFilterHeading
                label="Users"
                value={status}
                options={TEAM_STATUS_OPTIONS}
              />
            }
            primaryLabel="Add"
            primaryHref={newHref}
            primaryVariant="info"
            refresh
          />
        }
        list={list}
        detail={children}
      />
    </Page>
  )
}
