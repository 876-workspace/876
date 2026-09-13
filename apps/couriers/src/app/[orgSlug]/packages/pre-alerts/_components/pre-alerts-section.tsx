'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import {
  PRE_ALERTS_DROPDOWN_ACTIONS,
  PRE_ALERT_STATUS_OPTIONS,
  resolvePreAlertStatusFilter,
} from '../_lib/pre-alerts-list-config'

export function PreAlertsSection({
  orgSlug,
  list,
  children,
}: {
  orgSlug: string
  list: ReactNode
  children: ReactNode
}) {
  // A layout receives no `searchParams`, so the active filter is read here on
  // the client, where it stays current across navigations.
  const status = resolvePreAlertStatusFilter(useSearchParams().get('status'))

  return (
    <ListDetailSection
      toolbar={
        <ResourceToolbar
          title="Pre-alerts"
          titleFilter={
            <StatusFilterHeading
              label="Pre-alerts"
              value={status}
              options={PRE_ALERT_STATUS_OPTIONS}
            />
          }
          primaryLabel="Add"
          primaryHref={`/${orgSlug}/packages/pre-alerts/new`}
          primaryVariant="info"
          refresh
          dropdownActions={PRE_ALERTS_DROPDOWN_ACTIONS}
        />
      }
      list={list}
    >
      {children}
    </ListDetailSection>
  )
}
