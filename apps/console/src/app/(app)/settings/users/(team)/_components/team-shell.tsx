'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

export const TEAM_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All Users' },
  { value: 'active', label: 'Active', headingLabel: 'Active Users' },
  { value: 'suspended', label: 'Suspended', headingLabel: 'Suspended Users' },
  { value: 'expired', label: 'Expired', headingLabel: 'Expired Users' },
]

/**
 * Routes that own the whole content area instead of opening beside the list —
 * the create form, typically.
 */
const TAKEOVER_SEGMENTS = ['new'] as const

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
  const searchParams = useSearchParams()
  const status = searchParams.get('status') ?? 'all'
  const query = searchParams.toString()
  const newHref = query ? `/settings/users/new?${query}` : '/settings/users/new'

  return (
    <ListDetailSection
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
      takeoverSegments={TAKEOVER_SEGMENTS}
    >
      {children}
    </ListDetailSection>
  )
}
