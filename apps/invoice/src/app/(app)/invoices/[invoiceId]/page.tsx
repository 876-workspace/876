import { notFound, redirect } from 'next/navigation'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
} from '@876/ui/detail-card'
import { InvoiceDocumentPanel } from '@876/billing-ui/panels/invoice-document-panel'
import {
  invoiceDocumentData,
  invoiceSeller,
} from '@876/billing-ui/document/invoice-document-data'
import Link from 'next/link'
import { WorkWidgetContextSetter } from '@876/widgets/react'

import { getInvoiceContext } from '@/lib/auth/context'
import { canAccess } from '@/lib/auth/access-context'
import { requireAppPermission } from '@/lib/auth/guards'
import { createInvoiceWorkContext } from '@/lib/auth/work-widget-context'
import { getBilling } from '@/lib/services/billing'
import { getPlatformClient } from '@/lib/services/platform'
import { formatDate, formatMoney } from '@/lib/format'

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

  const [billing, platform] = await Promise.all([
    getBilling(context.orgId),
    getPlatformClient(),
  ])
  const [result, organization] = await Promise.all([
    billing.invoices.retrieve(invoiceId),
    platform.organizations.retrieve({ id: context.orgId }),
  ])
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

  // Branding is a preference, not a dependency: an organization whose row
  // cannot be read still gets its invoice document, without the letterhead.
  const seller = organization.data
    ? invoiceSeller(organization.data, context.orgName)
    : { name: context.orgName, countryLabel: null }

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
        <DetailCardHeader
          title={number}
          closeHref="/invoices"
          closeLabel="Close invoice details"
          className="print:hidden"
        />
        <DetailCardBody className="min-h-0 p-0 sm:p-0 print:overflow-visible print:p-0">
          <div className="w-full px-2 sm:px-3">
            <InvoiceActions
              invoiceId={invoice.id}
              customerId={customerId}
              status={status}
              canWrite={canWrite}
              canRecordPayment={canRecordPayment}
              documentNumber={invoice.number}
              totalAmount={formatMoney(invoice.totalAmount, invoice.currency)}
            />
          </div>
          <InvoiceDocumentPanel
            {...invoiceDocumentData(invoice, formatDate, formatMoney)}
            seller={seller}
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
