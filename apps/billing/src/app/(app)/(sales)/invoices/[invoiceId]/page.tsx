import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { buttonVariants } from '@876/ui/button'
import { cn } from '@876/ui/lib/utils'
import { XIcon } from '@876/ui/icons'
import { Page } from '@876/ui/page'
import { InvoiceDocumentPanel } from '@876/billing-ui/panels/invoice-document-panel'
import { InvoiceNextActionPanel } from '@876/billing-ui/panels/invoice-next-action-panel'
import { InvoicePaymentsPanel } from '@876/billing-ui/panels/invoice-payments-panel'
import {
  invoiceDocumentData,
  invoiceSeller,
} from '@876/billing-ui/document/invoice-document-data'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { getFeatures } from '@/lib/features'
import { formatDate, formatMoney } from '@/lib/format'
import { getBilling } from '@/lib/services/billing'
import { getPlatformClient } from '@/lib/services/platform'

import { InvoiceActions } from './_components/invoice-actions'
import { InvoiceOriginLink } from './_components/invoice-origin-link'
import { RelatedRequestsClient } from '../../../_components/related-requests-client'

interface Props {
  params: Promise<{ invoiceId: string }>
}

export const metadata: Metadata = {
  title: 'Invoice details',
  description: 'Review, print, and manage an invoice.',
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { invoiceId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const [billing, platform, features] = await Promise.all([
    getBilling(),
    getPlatformClient(),
    getFeatures({ userId: context.userId, organizationId: context.orgId }),
  ])
  const [invoiceResult, organization, templateResult] = await Promise.all([
    billing.invoices.retrieve(invoiceId),
    platform.organizations.retrieve({ id: context.orgId }),
    billing.documentTemplates.resolve('invoice'),
  ])
  if (invoiceResult.error?.code === 'invoice/not-found') notFound()
  if (invoiceResult.error || !invoiceResult.data) notFound()
  const invoice = invoiceResult.data

  // A template outage must never block an invoice: without a resolved
  // template the panel falls back to its built-in layout and brand.
  const template = templateResult.data
    ? {
        layout: templateResult.data.layout,
        settings: templateResult.data.settings,
      }
    : undefined
  const templateBranding = templateResult.data?.branding

  const canWrite = context.permissions.includes('sales:write')
  const canRecordPayment = context.permissions.includes('payments:write')
  const canViewRequests =
    features.productFeatures.requests &&
    context.permissions.includes('customers:read')
  const canCreateRequest = context.permissions.includes('customers:write')
  const recordPaymentHref = `/invoices/${encodeURIComponent(invoice.id)}/payments/new`
  const recurringInvoiceId =
    typeof invoice.recurringInvoiceId === 'string'
      ? invoice.recurringInvoiceId
      : null
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
    ? invoiceSeller(organization.data, context.tenant.name)
    : { name: context.tenant.name, countryLabel: null }

  return (
    <Page className="pt-0 print:p-0">
      <header className="border-border flex h-14 items-center justify-between gap-3 border-b print:hidden">
        <h1 className="876-page-title text-balance">{invoice.number}</h1>
        <Link
          href="/invoices"
          aria-label="Close invoice details"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
        >
          <XIcon className="size-4" />
        </Link>
      </header>

      <div className="mb-4 w-full px-2 sm:px-4">
        <InvoiceActions
          invoiceId={invoice.id}
          status={invoice.status}
          canWrite={canWrite}
          canRecordPayment={canRecordPayment}
          recordPaymentHref={recordPaymentHref}
          documentNumber={invoice.number}
          totalAmount={formatMoney(invoice.totalAmount, invoice.currency)}
        />
      </div>

      <div className="px-2 pb-8 sm:px-4 print:p-0">
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
            hrefForCreditNote={(id) => `/credit-notes/${id}`}
          />
        </div>
        <InvoiceDocumentPanel
          {...invoiceDocumentData(invoice, formatDate, formatMoney)}
          seller={seller}
          template={template}
          branding={templateBranding}
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
        {canViewRequests ? (
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
    </Page>
  )
}
