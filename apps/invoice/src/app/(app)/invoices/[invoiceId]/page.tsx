import { notFound, redirect } from 'next/navigation'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
} from '@876/ui/detail-card'
import { InvoiceDocumentPanel } from '@876/billing-ui/panels/invoice-document-panel'
import { InvoiceNextActionPanel } from '@876/billing-ui/panels/invoice-next-action-panel'
import { InvoicePaymentsPanel } from '@876/billing-ui/panels/invoice-payments-panel'
import {
  invoiceDocumentData,
  invoiceSeller,
} from '@876/billing-ui/document/invoice-document-data'
import Link from 'next/link'
import { WorkWidgetContextSetter } from '@876/widgets/react'

import { getInvoiceContext } from '@/lib/auth/context'
import { canAccess, hasAccessFeature } from '@/lib/auth/access-context'
import { requireAppPermission } from '@/lib/auth/guards'
import { createInvoiceWorkContext } from '@/lib/auth/work-widget-context'
import { INVOICE_REQUESTS_SLUG } from '@/lib/features'
import { getBilling } from '@/lib/clients/billing'
import { getPlatformClient } from '@/lib/clients/platform'
import { formatDate, formatMoney } from '@/lib/format'

import { InvoiceActions } from './_components/invoice-actions'
import { InvoiceOriginLink } from './_components/invoice-origin-link'
import { RelatedRequestsClient } from '../../_components/related-requests-client'

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
  const [result, organization, resolvedTemplate] = await Promise.all([
    billing.invoices.retrieve(invoiceId),
    platform.organizations.retrieve({ id: context.orgId }),
    billing.documentTemplates.resolve('invoice'),
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
  const canWrite = canAccess(access, 'invoices.edit')
  const canRecordPayment = canAccess(access, 'payments.create')
  const requestsEnabled =
    hasAccessFeature(access, INVOICE_REQUESTS_SLUG) &&
    canAccess(access, 'requests.view')
  const canCreateRequest = canAccess(access, 'requests.create')
  const recordPaymentHref = `/invoices/${encodeURIComponent(invoice.id)}/payments/new`

  const { number, status, recurringInvoiceId } = invoice
  let originProfileName: string | null = null
  if (recurringInvoiceId) {
    const origin = await billing.recurringInvoices.retrieve(recurringInvoiceId)
    if (!origin.error)
      originProfileName = String(
        (origin.data as unknown as Record<string, unknown>).profileName ??
          recurringInvoiceId
      )
  }

  const seller = organization.data
    ? invoiceSeller(organization.data, context.orgName)
    : { name: context.orgName, countryLabel: null }

  // A template outage must never block an invoice: without a resolved
  // template the panel falls back to its built-in defaults.
  const templateProps =
    resolvedTemplate.error || !resolvedTemplate.data
      ? {}
      : {
          template: {
            layout: resolvedTemplate.data.layout,
            settings: resolvedTemplate.data.settings,
          },
          branding: resolvedTemplate.data.branding,
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
        <DetailCardHeader
          title={number}
          closeHref="/invoices"
          closeLabel="Close invoice details"
          className="print:hidden"
        />
        <DetailCardBody className="min-h-0 p-0 sm:p-0 print:overflow-visible print:p-0">
          <div className="w-full px-2 sm:px-4">
            <InvoiceActions
              invoiceId={invoice.id}
              status={status}
              canWrite={canWrite}
              canRecordPayment={canRecordPayment}
              recordPaymentHref={recordPaymentHref}
              documentNumber={invoice.number}
              totalAmount={formatMoney(invoice.totalAmount, invoice.currency)}
            />
          </div>
          <div className="px-2 pt-4 pb-8 sm:px-4 print:p-0">
            {canRecordPayment ? (
              <div className="mb-6">
                <InvoiceNextActionPanel
                  status={invoice.status}
                  recordPaymentHref={recordPaymentHref}
                  balance={formatMoney(invoice.amountDue, invoice.currency)}
                />
              </div>
            ) : null}
            <div className="mb-6">
              <InvoicePaymentsPanel
                title="Payments received"
                state={{
                  status: 'ready',
                  data: {
                    payments: invoice.paymentAllocations.map((allocation) => ({
                      id: allocation.payment.id,
                      date: formatDate(allocation.payment.paymentDate),
                      number: allocation.payment.number,
                      reference: allocation.payment.referenceNumber,
                      mode: allocation.payment.paymentMode.name,
                      amount: formatMoney(
                        allocation.amount,
                        allocation.payment.currency
                      ),
                      status: allocation.payment.status,
                    })),
                    creditNotes: invoice.creditNoteAllocations.map(
                      (allocation) => ({
                        id: allocation.creditNote.id,
                        date: formatDate(allocation.creditNote.issueAt),
                        number: allocation.creditNote.number,
                        amount: formatMoney(
                          allocation.amount,
                          allocation.creditNote.currency
                        ),
                      })
                    ),
                  },
                }}
                hrefForPayment={(id) => `/payments/${id}`}
              />
            </div>
            <InvoiceDocumentPanel
              {...invoiceDocumentData(invoice, formatDate, formatMoney)}
              seller={seller}
              {...templateProps}
              footer={
                <>
                  <p>
                    {invoice.billingReason === 'MANUAL'
                      ? 'Manual invoice'
                      : invoice.billingReason
                          .toLowerCase()
                          .replaceAll('_', ' ')}
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
            {requestsEnabled ? (
              <RelatedRequestsClient
                customerId={invoice.customerId}
                resourceType="invoice"
                resourceId={invoice.id}
                snapshot={{
                  number: invoice.number,
                  amount: String(invoice.totalAmount),
                  currency: invoice.currency,
                  status: invoice.status,
                }}
                canCreate={canCreateRequest}
              />
            ) : null}
          </div>
        </DetailCardBody>
      </DetailCard>
    </>
  )
}
