import { notFound, redirect } from 'next/navigation'

import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { listInvoices } from '@/app/(app)/_lib/list-data'
import { getInvoiceContext } from '@/lib/auth/context'
import { requireAppPermission } from '@/lib/auth/guards'

import { InvoiceEditForm } from '../_components/invoice-edit-form'
import {
  getInvoiceEditability,
  type InvoiceStatus,
} from '../_lib/invoice-editability'

export const metadata = { title: 'Edit Invoice' }

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>
}) {
  const { invoiceId } = await params
  await requireAppPermission('invoices.write')
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')
  const result = await listInvoices(context.orgId)
  const invoice = result.data?.data.find((row) => row.id === invoiceId)
  if (!invoice) notFound()
  const status = String(invoice.status ?? 'DRAFT') as InvoiceStatus
  if (!getInvoiceEditability(status).editable)
    redirect(`/invoices/${encodeURIComponent(invoiceId)}`)
  return (
    <Page>
      <PageHeader>
        <PageTitle>Edit Invoice</PageTitle>
      </PageHeader>
      <InvoiceEditForm
        invoiceId={invoice.id}
        status={status}
        initial={{
          issueAt: typeof invoice.issueAt === 'number' ? invoice.issueAt : null,
          dueAt: typeof invoice.dueAt === 'number' ? invoice.dueAt : null,
          notes: typeof invoice.notes === 'string' ? invoice.notes : null,
          terms: typeof invoice.terms === 'string' ? invoice.terms : null,
          orderNumber:
            typeof invoice.orderNumber === 'string'
              ? invoice.orderNumber
              : null,
          referenceNumber:
            typeof invoice.referenceNumber === 'string'
              ? invoice.referenceNumber
              : null,
          subject: typeof invoice.subject === 'string' ? invoice.subject : null,
        }}
      />
    </Page>
  )
}
