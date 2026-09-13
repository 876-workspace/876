'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { CustomerListShell } from '@876/crm-ui/customer-list-shell'
import { useListDetailRoute } from '@876/ui/list-detail-shell'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import { useCustomerLinks } from '../_lib/use-customer-links'

export const CUSTOMER_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All Customers' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

/**
 * Segments that take over the whole content area instead of opening in the
 * card slot. They keep the `/customers` URL prefix — so the sidebar stays on
 * Customers — but the toolbar and list stand down and the route owns the
 * screen. Zoho does the same for its statement-email composer.
 */
const TAKEOVER_SEGMENTS = ['edit'] as const

type Props = {
  /** The list column — a customers table when closed, a condensed list when open. */
  list: ReactNode
  /** The card slot: whatever route is active under `/customers`. */
  children: ReactNode
}

/** The persistent frame for every `/customers` route. */
export function CustomersShell({ list, children }: Props) {
  const { open, takeover } = useListDetailRoute(TAKEOVER_SEGMENTS)
  const searchParams = useSearchParams()
  const linkTo = useCustomerLinks()

  // A takeover route owns the whole content area, so it must not be wrapped in
  // this section's `Page` measure either. The shared shell stands its own
  // chrome down; the host stands down the frame around it.
  if (takeover) return children

  // A layout receives no `searchParams`, so the filter is read here on the
  // client, where it stays current across navigations.
  const status = searchParams.get('status') ?? 'all'

  return (
    <Page className="h-full min-h-0">
      <CustomerListShell
        takeoverSegments={TAKEOVER_SEGMENTS}
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
            primaryHref={linkTo('/customers/new')}
            primaryVariant="info"
            refresh
            dropdownActions={[
              { label: 'Import', icon: 'import', disabled: true },
              { label: 'Export', icon: 'export', disabled: true },
            ]}
          />
        }
        list={list}
      >
        {children}
      </CustomerListShell>
    </Page>
  )
}
