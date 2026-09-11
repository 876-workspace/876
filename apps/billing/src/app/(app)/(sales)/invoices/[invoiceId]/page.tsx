import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Badge } from '@876/ui/badge'
import { ArrowLeft } from '@876/ui/icons'
import { Page } from '@876/ui/page'
import { InvoiceDocumentPanel } from '@876/billing-ui/panels/invoice-document-panel'
import { invoiceDocumentData } from '@876/billing-ui/document/invoice-document-data'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'
import { getBilling } from '@/lib/services/billing'
import type { InvoiceStatus } from '@/types/invoice'

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

  const billing = await getBilling()
  const invoiceResult = await billing.invoices.retrieve(invoiceId)
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

  return (
    <Page className="print:p-0">
      <header className="mx-auto mb-5 flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <Link
            href="/invoices"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium"
          >
            <ArrowLeft className="size-4" />
            Invoices
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-balance">
              {invoice.number}
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>
        {canWrite ? (
          <InvoiceActions
            invoiceId={invoice.id}
            customerId={invoice.customerId}
            status={invoice.status}
            canRecordPayment={canRecordPayment}
          />
        ) : null}
      </header>

      <InvoiceDocumentPanel
        {...invoiceDocumentData(invoice, formatDate, formatMoney)}
        seller={{
          name: context.tenant.name,
          countryLabel: countryName(context.tenant.countryCode),
        }}
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

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const variant =
    status === 'PAID'
      ? 'success'
      : status === 'OVERDUE' || status === 'UNCOLLECTIBLE'
        ? 'destructive'
        : status === 'OPEN' || status === 'SENT' || status === 'PARTIALLY_PAID'
          ? 'info'
          : 'secondary'

  return (
    <Badge variant={variant} className="capitalize">
      {status.toLowerCase().replaceAll('_', ' ')}
    </Badge>
  )
}

function countryName(countryCode: string) {
  try {
    return (
      new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode) ??
      countryCode
    )
  } catch {
    return countryCode
  }
}
