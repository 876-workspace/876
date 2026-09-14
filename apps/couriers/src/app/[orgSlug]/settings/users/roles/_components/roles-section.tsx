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
 * whether a role is one 876 ships or one this organization defined. The filter
 * key is therefore `type`, not `status`.
 */
export const ROLE_TYPE_PARAM = 'type'

export const ROLE_TYPE_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All Roles' },
  { value: 'system', label: 'System', headingLabel: 'System Roles' },
  { value: 'custom', label: 'Custom', headingLabel: 'Custom Roles' },
]

const ROLE_TYPE_VALUES = ['all', 'system', 'custom'] as const
export type RoleTypeFilter = (typeof ROLE_TYPE_VALUES)[number]

export function isRoleTypeFilter(
  value: string | null
): value is RoleTypeFilter {
  return ROLE_TYPE_VALUES.some((option) => option === value)
}

type Props = {
  orgSlug: string
  /** The role list — a table when closed, a condensed list when open. */
  list: ReactNode
  /** The role card: whatever route is active under `settings/users/roles`. */
  children: ReactNode
}

/**
 * The persistent frame for every `/settings/users/roles` route. The create
 * form opens in the detail column like any other record, so no takeover
 * segments: `new` simply selects nothing in the list.
 */
export function RolesSection({ orgSlug, list, children }: Props) {
  // A layout receives no `searchParams`, so the active filter is read here on
  // the client, where it stays current across navigations.
  const rawType = useSearchParams().get(ROLE_TYPE_PARAM)
  const type = isRoleTypeFilter(rawType) ? rawType : 'all'

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
          primaryHref={`/${orgSlug}/settings/users/roles/new`}
          primaryVariant="info"
          refresh
        />
      }
      list={list}
      className="h-full min-h-0"
    >
      {children}
    </ListDetailSection>
  )
}
