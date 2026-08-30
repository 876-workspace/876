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

export const SETUP_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Provisioning' },
  { value: 'active', label: 'Active', headingLabel: 'Active Provisioning' },
  {
    value: 'archived',
    label: 'Archived',
    headingLabel: 'Archived Provisioning',
  },
]

/** Routes that own the whole content area instead of opening beside the list. */
const TAKEOVER_SEGMENTS = ['new', 'runs', 'edit'] as const

type Props = {
  /** The setup list — a table when closed, a condensed list when open. */
  list: ReactNode
  /** The setup card: whatever route is active under `/settings/orgs/provisioning`. */
  children: ReactNode
}

/** The persistent frame for every `/settings/orgs/provisioning` route. */
export function ProvisioningShell({ list, children }: Props) {
  const { open, takeover } = useListDetailRoute(TAKEOVER_SEGMENTS)
  const searchParams = useSearchParams()

  if (takeover) return children

  const status = searchParams.get('status') ?? 'all'

  return (
    <Page className="h-full min-h-0">
      <ListDetailShell
        open={open}
        toolbar={
          <ResourceToolbar
            title="Provisioning"
            titleFilter={
              <StatusFilterHeading
                label="Provisioning"
                value={status}
                options={SETUP_STATUS_OPTIONS}
              />
            }
            primaryLabel="Add"
            primaryHref="/settings/orgs/provisioning/new"
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
