import { notFound, redirect } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DetailCard, DetailCardBody } from '@876/ui/detail-card'
import { InvoiceDocumentPanel } from '@876/billing-ui/panels/invoice-document-panel'
import { invoiceDocumentData } from '@876/billing-ui/document/invoice-document-data'
import Link from 'next/link'
import { WorkWidgetContextSetter } from '@876/widgets/react'

import { getInvoiceContext } from '@/lib/auth/context'
import { canAccess } from '@/lib/auth/access-context'
import { requireAppPermission } from '@/lib/auth/guards'
import { createInvoiceWorkContext } from '@/lib/auth/work-widget-context'
import { getBilling } from '@/lib/services/billing'
import { formatDate, formatMoney } from '@/lib/format'
import { documentStatusVariant } from '@/lib/status'

import { InvoiceActions } from './_components/invoice-actions'
import { InvoiceOriginLink } from './_components/invoice-origin-link'

type Props = { params: Promise<{ invoiceId: string }> }

export const metadata = {
  title: 'Invoice',
  description: 'Invoice details.',
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { invoiceId } = await params
  const access = await requireAppPermission('invoices.view')
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const billing = await getBilling(context.orgId)
  const result = await billing.invoices.retrieve(invoiceId)
  if (result.error?.code === 'invoice/not-found') notFound()
  if (result.error) {
    return (
      <DetailCard aria-label="Invoice unavailable">
        <DetailCardBody>
          <p className="text-muted-foreground text-sm">
            Invoice details are unavailable right now.
          </p>
        </DetailCardBody>
      </DetailCard>
    )
  }

  const invoice = result.data
  const canWrite = canAccess(access, 'invoices.write')
  const canRecordPayment = canAccess(access, 'payments.create')

  const { number, customerId, status, recurringInvoiceId } = invoice
  let originProfileName: string | null = null
  if (recurringInvoiceId) {
    const origin = await billing.recurringInvoices.retrieve(recurringInvoiceId)
    if (!origin.error)
      originProfileName = String(
        (origin.data as unknown as Record<string, unknown>).profileName ??
          recurringInvoiceId
      )
  }

  return (
    <>
      <WorkWidgetContextSetter
        context={createInvoiceWorkContext(invoice)}
        routeBase={`/api/invoices/${encodeURIComponent(invoice.id)}/work`}
      />
      <DetailCard
        aria-label={`Invoice details: ${number}`}
        className="min-h-0 print:h-auto print:overflow-visible print:border-0 print:shadow-none"
      >
        <header className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6 print:hidden">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{number}</h1>
            <Badge variant={documentStatusVariant(status)}>
              {status.toLowerCase().replaceAll('_', ' ')}
            </Badge>
          </div>
          <InvoiceActions
            invoiceId={invoice.id}
            customerId={customerId}
            status={status}
            canWrite={canWrite}
            canRecordPayment={canRecordPayment}
          />
        </header>
        <DetailCardBody className="min-h-0 p-0 sm:p-0 print:overflow-visible print:p-0">
          <InvoiceDocumentPanel
            {...invoiceDocumentData(invoice, formatDate, formatMoney)}
            seller={{ name: context.orgName, countryLabel: '' }}
            footer={
              <>
                <p>
                  {invoice.billingReason === 'MANUAL'
                    ? 'Manual invoice'
                    : invoice.billingReason.toLowerCase().replaceAll('_', ' ')}
                  {invoice.subscriptionId
                    ? ` · Subscription ${invoice.subscriptionId}`
                    : ''}
                </p>
                {invoice.lateFeeAssessment ? (
                  <p className="mt-1">
                    Late fee for{' '}
                    <Link
                      href={`/invoices/${invoice.lateFeeAssessment.sourceInvoice.id}`}
                      className="underline underline-offset-2"
                    >
                      {invoice.lateFeeAssessment.sourceInvoice.number}
                    </Link>
                  </p>
                ) : null}
                {recurringInvoiceId && originProfileName ? (
                  <InvoiceOriginLink
                    profileId={recurringInvoiceId}
                    profileName={originProfileName}
                  />
                ) : null}
              </>
            }
          />
        </DetailCardBody>
      </DetailCard>
    </>
  )
}
