'use client'

import type { ReactNode } from 'react'
import { useSearchParams, useSelectedLayoutSegments } from 'next/navigation'
import { cn } from '@876/core/utils'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import { useCustomerLinks } from '../_lib/use-customer-links'

export const CUSTOMER_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All customers' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

/**
 * Segments that take over the whole content area instead of opening in the
 * card slot. They keep the `/customers` URL prefix — so the sidebar stays on
 * Customers — but the toolbar and list stand down and the route owns the
 * screen. Zoho does the same for its statement-email composer.
 */
const TAKEOVER_SEGMENTS = new Set(['edit'])

type Props = {
  /** The list column — a customers table when closed, a condensed list when open. */
  list: ReactNode
  /** The card slot: whatever route is active under `/customers`. */
  children: ReactNode
}

/**
 * The persistent frame for every `/customers` route.
 *
 * Because this lives in the layout, the toolbar and the list survive every
 * navigation below it — opening a customer, switching tabs, and closing again
 * never remount the list or refetch it. That persistence is also what makes
 * the open/close transition possible: the list column is a single element
 * whose grid track animates from full width down to the sidebar width, rather
 * than two different trees swapping places.
 */
export function CustomersShell({ list, children }: Props) {
  // Segments below this layout: [] on /customers, ['<id>'] on a customer,
  // ['<id>', 'mails'] on a tab. That is the whole open/closed signal — no
  // state and no props, so it cannot drift from the URL.
  const segments = useSelectedLayoutSegments()
  const searchParams = useSearchParams()
  const linkTo = useCustomerLinks()

  if (segments.some((segment) => TAKEOVER_SEGMENTS.has(segment)))
    return children

  const open = segments.length > 0
  // A layout receives no `searchParams`, so the filter is read here on the
  // client, where it stays current across navigations.
  const status = searchParams.get('status') ?? 'all'

  return (
    <Page
      className={cn(
        'md:grid md:h-full md:min-h-0 md:grid-rows-[auto_auto_minmax(0,1fr)]',
        // Animating the track itself is what produces "the table closes in and
        // the card comes out": one grid, two column widths, 300ms between them.
        'md:transition-[grid-template-columns,column-gap] md:duration-300 md:ease-out',
        open
          ? 'md:grid-cols-[18rem_minmax(0,1fr)] md:gap-x-4 lg:grid-cols-[20rem_minmax(0,1fr)]'
          : 'md:grid-cols-[minmax(0,1fr)_0fr] md:gap-x-0'
      )}
    >
      <div className="md:col-start-1 md:row-start-1">
        <ResourceToolbar
          title="Customers"
          titleFilter={
            <StatusFilterHeading
              label="Customers"
              value={status}
              options={CUSTOMER_STATUS_OPTIONS}
            />
          }
          /*
           * The Add action belongs to the list view. While a card is open the
           * card is the subject, and a second create affordance beside it
           * competes with the record on screen.
           */
          primaryLabel={open ? undefined : 'Add'}
          primaryHref={linkTo('/customers/new')}
          primaryVariant="info"
        />
      </div>

      <div className="md:col-start-1 md:row-start-3 md:min-h-0">{list}</div>

      {/*
       * Column 2, spanning all three rows: the card starts at the very top
       * rather than being pushed down by the toolbar. `overflow-hidden` keeps
       * it clipped to the zero-width track while closed, so there is nothing
       * to see until the track opens.
       */}
      <div
        className={cn(
          'md:col-start-2 md:row-span-3 md:row-start-1 md:min-h-0 md:overflow-hidden',
          open ? 'mt-4 md:mt-0' : 'hidden md:block'
        )}
      >
        {children}
      </div>
    </Page>
  )
}
