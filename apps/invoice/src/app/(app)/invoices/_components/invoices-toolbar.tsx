'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { INVOICE_STATUS_OPTIONS } from '@876/billing-ui/document-status'

export function InvoicesToolbar({
  status,
  showPrimary,
}: {
  status: string
  showPrimary: boolean
}) {
  return (
    <ResourceToolbar
      title="Invoices"
      titleFilter={
        <StatusFilterHeading
          label="Invoices"
          value={status}
          options={INVOICE_STATUS_OPTIONS}
        />
      }
      primaryLabel={showPrimary ? 'Add' : undefined}
      primaryHref={showPrimary ? '/invoices/new' : undefined}
      primaryVariant="info"
      refresh
    />
  )
}
