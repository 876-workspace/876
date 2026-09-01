'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailShell, useListDetailRoute } from '@876/ui/list-detail-shell'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

export const PROFILE_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Profiles' },
  { value: 'active', label: 'Active', headingLabel: 'Active Profiles' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Profiles' },
  {
    value: 'archived',
    label: 'Archived',
    headingLabel: 'Archived Profiles',
  },
]

/** Routes that own the whole content area instead of opening beside the list. */
const TAKEOVER_SEGMENTS = ['runs'] as const

type Props = {
  slug: string
  appId: string
  /** The profile list — a table when closed, a condensed list when open. */
  list: ReactNode
  /** The profile card: whatever route is active under `/apps/[slug]/provisioning`. */
  children: ReactNode
}

/** The persistent frame for every `/apps/[slug]/provisioning` route. */
export function AppProvisioningShell({ slug, appId, list, children }: Props) {
  const { open, takeover } = useListDetailRoute(TAKEOVER_SEGMENTS)
  const searchParams = useSearchParams()

  if (takeover) return children

  const status = searchParams.get('status') ?? 'all'

  return (
    <div className="h-full min-h-0">
      <ListDetailShell
        open={open}
        toolbar={
          <ResourceToolbar
            title="Provisioning"
            titleFilter={
              <StatusFilterHeading
                label="Profiles"
                value={status}
                options={PROFILE_STATUS_OPTIONS}
              />
            }
            primaryLabel="Add"
            primaryHref={`/apps/${encodeURIComponent(slug)}/provisioning/new`}
            primaryVariant="info"
            refresh
            dropdownActions={[
              {
                label: 'View runs',
                href: `/settings/orgs/provisioning/runs?app_id=${encodeURIComponent(appId)}`,
              },
            ]}
          />
        }
        list={list}
        detail={children}
      />
    </div>
  )
}
