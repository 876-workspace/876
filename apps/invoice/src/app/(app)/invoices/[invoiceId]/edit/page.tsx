import { notFound, redirect } from 'next/navigation'

import { Page, PageHeader, PageTitle } from '@876/ui/page'
import { formatMinorUnits } from '@876/billing-ui/document/document-line-items-editor'

import { getInvoiceContext } from '@/lib/auth/context'
import { requireAppPermission } from '@/lib/auth/guards'
import { getBilling } from '@/lib/services/billing'

import { DocumentCreateForm } from '@/features/documents/components/document-create-form'
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
  const billing = await getBilling(context.orgId)
  const result = await billing.invoices.retrieve(invoiceId)
  if (result.error?.code === 'invoice/not-found') notFound()
  if (result.error || !result.data)
    redirect(`/invoices/${encodeURIComponent(invoiceId)}`)
  const invoice = result.data
  const status = invoice.status as InvoiceStatus
  if (!getInvoiceEditability(status).editable)
    redirect(`/invoices/${encodeURIComponent(invoiceId)}`)
  return (
    <Page>
      <PageHeader>
        <PageTitle>Edit Invoice</PageTitle>
      </PageHeader>
      <DocumentCreateForm
        kind="invoice"
        mode="edit"
        initialDocument={{
          invoiceId: invoice.id,
          status,
          values: {
            issueAt:
              typeof invoice.issueAt === 'number' ? invoice.issueAt : null,
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
            subject:
              typeof invoice.subject === 'string' ? invoice.subject : null,
          },
          lines: invoice.lines.map((line) => ({
            id: line.id,
            itemId: line.itemId,
            variantId: line.variantId,
            priceId: line.priceId,
            description: line.description,
            quantity: String(line.quantity),
            unitAmount: formatMinorUnits(BigInt(line.unitAmount)),
            discountAmount: formatMinorUnits(BigInt(line.discountAmount)),
            taxAmount: formatMinorUnits(BigInt(line.taxAmount)),
          })),
        }}
      />
    </Page>
  )
}
