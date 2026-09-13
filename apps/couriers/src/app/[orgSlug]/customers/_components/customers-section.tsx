'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import {
  CUSTOMER_STATUS_OPTIONS,
  CUSTOMERS_DROPDOWN_ACTIONS,
  resolveCustomerStatusFilter,
} from '../_lib/customers-list-config'

/** The edit form owns the whole content area rather than opening beside the list. */
export const CUSTOMERS_TAKEOVER_SEGMENTS = ['edit'] as const

export function CustomersSection({
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
  const status = resolveCustomerStatusFilter(useSearchParams().get('status'))

  return (
    <ListDetailSection
      toolbar={
        <ResourceToolbar
          title="Customers"
          titleFilter={
            <StatusFilterHeading
              label="Customers"
              value={status}
              options={CUSTOMER_STATUS_OPTIONS}
            />
          }
          primaryLabel="Add"
          primaryHref={`/${orgSlug}/customers/new`}
          primaryVariant="info"
          refresh
          dropdownActions={CUSTOMERS_DROPDOWN_ACTIONS}
        />
      }
      list={list}
      takeoverSegments={CUSTOMERS_TAKEOVER_SEGMENTS}
    >
      {children}
    </ListDetailSection>
  )
}
