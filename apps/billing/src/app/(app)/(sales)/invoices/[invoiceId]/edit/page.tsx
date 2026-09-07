import { redirect } from 'next/navigation'

import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { resolveInvoice } from '@/app/(app)/_lib/detail-data'
import { requirePagePermission } from '@/lib/auth/billing-context'

import { InvoiceEditForm } from '../_components/invoice-edit-form'
import { getInvoiceEditability } from '../_lib/invoice-editability'

export const metadata = { title: 'Edit Invoice' }

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>
}) {
  const { invoiceId } = await params
  const context = await requirePagePermission('sales:write')
  const invoice = await resolveInvoice(context.tenant.id, invoiceId)
  if (!invoice || !getInvoiceEditability(invoice.status).editable)
    redirect(`/invoices/${encodeURIComponent(invoiceId)}`)

  return (
    <Page>
      <PageHeader>
        <PageTitle>Edit Invoice</PageTitle>
      </PageHeader>
      <InvoiceEditForm
        invoiceId={invoice.id}
        status={invoice.status}
        initial={{
          issueAt: invoice.issueAt,
          dueAt: invoice.dueAt,
          notes: invoice.notes,
          terms: invoice.terms,
          orderNumber: invoice.orderNumber,
          referenceNumber: invoice.referenceNumber,
          subject: invoice.subject,
        }}
      />
    </Page>
  )
}
