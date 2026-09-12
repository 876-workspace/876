import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { buttonVariants } from '@876/ui/button'
import { cn } from '@876/ui/lib/utils'
import { XIcon } from '@876/ui/icons'
import { Page } from '@876/ui/page'
import { InvoiceDocumentPanel } from '@876/billing-ui/panels/invoice-document-panel'
import {
  invoiceDocumentData,
  invoiceSeller,
} from '@876/billing-ui/document/invoice-document-data'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'
import { getBilling } from '@/lib/services/billing'
import { getPlatformClient } from '@/lib/services/platform'

import { InvoiceActions } from './_components/invoice-actions'
import { InvoiceOriginLink } from './_components/invoice-origin-link'

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

  const [billing, platform] = await Promise.all([
    getBilling(),
    getPlatformClient(),
  ])
  const [invoiceResult, organization] = await Promise.all([
    billing.invoices.retrieve(invoiceId),
    platform.organizations.retrieve({ id: context.orgId }),
  ])
  if (invoiceResult.error?.code === 'invoice/not-found') notFound()
  if (invoiceResult.error || !invoiceResult.data) notFound()
  const invoice = invoiceResult.data

  const canWrite = context.permissions.includes('sales:write')
  const canRecordPayment = context.permissions.includes('payments:write')
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

  // Branding is a preference, not a dependency: an organization whose row
  // cannot be read still gets its invoice document, without the letterhead.
  const seller = organization.data
    ? invoiceSeller(organization.data, context.tenant.name)
    : { name: context.tenant.name, countryLabel: null }

  return (
    <Page className="print:p-0">
      <header className="mx-auto mb-3 flex max-w-5xl items-start justify-between gap-3 print:hidden">
        <h1 className="876-page-title text-balance">{invoice.number}</h1>
        <Link
          href="/invoices"
          aria-label="Close invoice details"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
        >
          <XIcon className="size-4" />
        </Link>
      </header>

      <div className="mx-auto mb-3 w-full max-w-5xl">
        <InvoiceActions
          invoiceId={invoice.id}
          customerId={invoice.customerId}
          status={invoice.status}
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
    </Page>
  )
}
