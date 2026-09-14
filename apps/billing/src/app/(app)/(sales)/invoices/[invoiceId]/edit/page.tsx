import { redirect } from 'next/navigation'

import { formatMinorUnits } from '@876/billing-ui/document/document-line-items-editor'

import { resolveInvoice } from '@/app/(app)/_lib/detail-data'
import { toDocumentTaxRateOptions } from '@876/billing-ui/document/document-tax-rate-options'
import { DocumentFormPage } from '@876/billing-ui/document/document-form-layout'
import { DocumentCreateForm } from '@/features/documents/components/document-create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

import { getInvoiceEditability } from '../_lib/invoice-editability'

export const metadata = { title: 'Edit Invoice' }

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>
}) {
  const { invoiceId } = await params
  const context = await requirePagePermission('sales:write')
  const [invoice, taxRates] = await Promise.all([
    resolveInvoice(context.tenant.id, invoiceId),
    service.taxRates.list(context.tenant.id),
  ])
  if (!invoice || !getInvoiceEditability(invoice.status).editable)
    redirect(`/invoices/${encodeURIComponent(invoiceId)}`)

  return (
    <DocumentFormPage title="Edit Invoice">
      <DocumentCreateForm
        kind="invoice"
        items={[]}
        currencies={[]}
        defaultCurrency={invoice.currency}
        returnUrl="/invoices"
        mode="edit"
        taxRates={toDocumentTaxRateOptions(taxRates)}
        initialDocument={{
          invoiceId: invoice.id,
          status: invoice.status,
          values: {
            issueAt: invoice.issueAt,
            dueAt: invoice.dueAt,
            notes: invoice.notes,
            terms: invoice.terms,
            orderNumber: invoice.orderNumber,
            referenceNumber: invoice.referenceNumber,
            subject: invoice.subject,
          },
          lines: invoice.lines.map((line) => ({
            id: line.id,
            itemId: line.itemId,
            variantId: line.variantId,
            priceId: line.priceId,
            description: line.description,
            quantity: String(line.quantity),
            unitAmount: formatMinorUnits(line.unitAmount),
            discountAmount: formatMinorUnits(line.discountAmount),
            taxAmount: formatMinorUnits(line.taxAmount),
          })),
        }}
      />
    </DocumentFormPage>
  )
}
