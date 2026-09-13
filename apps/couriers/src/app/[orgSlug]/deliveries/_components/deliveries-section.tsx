'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import {
  DELIVERIES_DROPDOWN_ACTIONS,
  DELIVERY_STATUS_OPTIONS,
  resolveDeliveryStatusFilter,
} from '../_lib/deliveries-list-config'

export function DeliveriesSection({
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
  const status = resolveDeliveryStatusFilter(useSearchParams().get('status'))

  return (
    <ListDetailSection
      toolbar={
        <ResourceToolbar
          title="Deliveries"
          titleFilter={
            <StatusFilterHeading
              label="Deliveries"
              value={status}
              options={DELIVERY_STATUS_OPTIONS}
            />
          }
          primaryLabel="Add"
          primaryHref={`/${orgSlug}/deliveries/new`}
          primaryVariant="info"
          refresh
          dropdownActions={DELIVERIES_DROPDOWN_ACTIONS}
        />
      }
      list={list}
    >
      {children}
    </ListDetailSection>
  )
}
