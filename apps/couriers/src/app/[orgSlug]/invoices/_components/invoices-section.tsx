'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import {
  INVOICES_DROPDOWN_ACTIONS,
  INVOICE_STATUS_OPTIONS,
  resolveInvoiceStatus,
} from '../_lib/invoices-list-config'

export function InvoicesSection({
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
  const { selected } = resolveInvoiceStatus(
    useSearchParams().get('status') ?? undefined
  )

  return (
    <ListDetailSection
      toolbar={
        <ResourceToolbar
          title="Invoices"
          titleFilter={
            <StatusFilterHeading
              label="Invoices"
              value={selected}
              options={INVOICE_STATUS_OPTIONS}
            />
          }
          primaryLabel="Add"
          primaryHref={`/${orgSlug}/invoices/new`}
          primaryVariant="info"
          refresh
          dropdownActions={INVOICES_DROPDOWN_ACTIONS}
        />
      }
      list={list}
    >
      {children}
    </ListDetailSection>
  )
}
