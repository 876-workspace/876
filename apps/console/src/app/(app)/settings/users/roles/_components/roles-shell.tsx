'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

/**
 * Roles have no lifecycle status; what an operator actually filters by is
 * whether a role is one 876 ships or one this Console defined. The filter key
 * is therefore `type`, not `status`.
 */
export const ROLE_TYPE_PARAM = 'type'

export const ROLE_TYPE_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Roles' },
  { value: 'system', label: 'System', headingLabel: 'System Roles' },
  { value: 'custom', label: 'Custom', headingLabel: 'Custom Roles' },
]

type Props = {
  /** The role list — a table when closed, a condensed list when open. */
  list: ReactNode
  /** The role card: whatever route is active under `/settings/users/roles`. */
  children: ReactNode
}

/**
 * Routes that own the whole content area instead of opening beside the list —
 * the create form.
 */
const TAKEOVER_SEGMENTS = ['new'] as const

/** The persistent frame for every `/settings/users/roles` route. */
export function RolesShell({ list, children }: Props) {
  const searchParams = useSearchParams()

  const type = searchParams.get(ROLE_TYPE_PARAM) ?? 'all'

  return (
    <ListDetailSection
      toolbar={
        <ResourceToolbar
          title="Roles"
          titleFilter={
            <StatusFilterHeading
              label="Roles"
              value={type}
              options={ROLE_TYPE_OPTIONS}
              paramKey={ROLE_TYPE_PARAM}
            />
          }
          primaryLabel="Add"
          primaryHref="/settings/users/roles/new"
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
