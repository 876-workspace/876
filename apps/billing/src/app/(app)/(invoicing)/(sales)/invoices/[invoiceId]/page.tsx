import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Badge } from '@876/ui/badge'
import { ArrowLeft } from '@876/ui/icons'
import { Page } from '@876/ui/page'
import {
  DocumentView,
  DocumentHeader,
  DocumentHeaderTop,
  DocumentTitle,
  DocumentDetailsGrid,
  DocumentRecipient,
  DocumentMetaList,
  DocumentMeta,
  DocumentLines,
  DocumentSummaryGrid,
  DocumentNotes,
  DocumentSummaryList,
  DocumentSummaryRow,
  DocumentTotalRow,
  DocumentFooter,
} from '@876/ui/document-view'

import { resolveInvoice } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'
import type { InvoiceStatus } from '@/types/invoice'

import { InvoiceActions } from './invoice-actions'

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

  const invoice = await resolveInvoice(context.tenant.id, invoiceId)
  if (!invoice) notFound()

  const canWrite = context.permissions.includes('sales:write')
  const address =
    invoiceAddressSnapshot(invoice.billingAddressSnapshot) ??
    invoice.customer.addresses[0]
  const customerName =
    invoice.customerName ??
    invoice.customer.companyName ??
    invoice.customer.name
  const customerEmail = invoice.customerEmail ?? invoice.customer.email

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
          <InvoiceActions invoiceId={invoice.id} status={invoice.status} />
        ) : null}
      </header>

      <DocumentView>
        <DocumentHeader>
          <DocumentHeaderTop>
            <div>
              <p className="text-xl font-semibold">{context.tenant.name}</p>
              <p className="text-muted-foreground mt-1 text-sm print:text-neutral-600">
                {countryName(context.tenant.countryCode)}
              </p>
            </div>
            <DocumentTitle>
              <p className="text-3xl font-semibold tracking-tight">INVOICE</p>
              <p className="mt-2 font-medium tabular-nums">#{invoice.number}</p>
              <p className="text-muted-foreground mt-1 text-sm capitalize print:text-neutral-600">
                {invoice.status.toLowerCase().replaceAll('_', ' ')}
              </p>
              {invoice.subject ? (
                <p className="mt-2 max-w-sm text-sm font-medium text-pretty">
                  {invoice.subject}
                </p>
              ) : null}
            </DocumentTitle>
          </DocumentHeaderTop>
        </DocumentHeader>

        <DocumentDetailsGrid>
          <DocumentRecipient>
            <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase print:text-neutral-600">
              Bill to
            </h2>
            <div className="mt-3 text-sm leading-6">
              <p className="font-semibold">{customerName}</p>
              {address?.attention ? <p>{address.attention}</p> : null}
              {address?.line1 ? <p>{address.line1}</p> : null}
              {address?.line2 ? <p>{address.line2}</p> : null}
              {address ? <p>{formatAddressLocality(address)}</p> : null}
              {customerEmail ? <p>{customerEmail}</p> : null}
              {invoice.customer.phone ? <p>{invoice.customer.phone}</p> : null}
            </div>
          </DocumentRecipient>

          <DocumentMetaList>
            <DocumentMeta
              label="Invoice date"
              value={formatDate(invoice.issueAt)}
            />
            <DocumentMeta label="Due date" value={formatDate(invoice.dueAt)} />
            {invoice.orderNumber ? (
              <DocumentMeta label="Order number" value={invoice.orderNumber} />
            ) : null}
            {invoice.referenceNumber ? (
              <DocumentMeta label="Reference" value={invoice.referenceNumber} />
            ) : null}
            <DocumentMeta
              label="Tax display"
              value={
                invoice.taxBehavior === 'INCLUSIVE'
                  ? 'Tax inclusive'
                  : 'Tax exclusive'
              }
            />
            {invoice.paymentTermName ? (
              <DocumentMeta
                label="Payment terms"
                value={invoice.paymentTermName}
              />
            ) : null}
            {invoice.salespersonName ? (
              <DocumentMeta
                label="Salesperson"
                value={invoice.salespersonName}
              />
            ) : null}
            {invoice.servicePeriodStart || invoice.servicePeriodEnd ? (
              <DocumentMeta
                label="Service period"
                value={`${formatDate(invoice.servicePeriodStart)} – ${formatDate(invoice.servicePeriodEnd)}`}
              />
            ) : null}
          </DocumentMetaList>
        </DocumentDetailsGrid>

        <DocumentLines>
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-border bg-muted/40 text-muted-foreground border-y print:border-neutral-200 print:bg-neutral-50 print:text-neutral-700">
                <th className="px-3 py-3 text-left font-medium">Description</th>
                <th className="px-3 py-3 text-right font-medium">Qty</th>
                <th className="px-3 py-3 text-right font-medium">Rate</th>
                <th className="px-3 py-3 text-right font-medium">Discount</th>
                <th className="px-3 py-3 text-right font-medium">Tax</th>
                <th className="px-3 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line) => (
                <tr
                  key={line.id}
                  className="border-border border-b align-top print:border-neutral-200"
                >
                  <td className="px-3 py-4">
                    <p className="font-medium">{line.description}</p>
                    {line.servicePeriodStart || line.servicePeriodEnd ? (
                      <p className="text-muted-foreground mt-1 text-xs print:text-neutral-600">
                        {formatDate(line.servicePeriodStart)} –{' '}
                        {formatDate(line.servicePeriodEnd)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-4 text-right tabular-nums">
                    {line.quantity}
                  </td>
                  <td className="px-3 py-4 text-right tabular-nums">
                    {formatMoney(line.unitAmount, invoice.currency)}
                  </td>
                  <td className="px-3 py-4 text-right tabular-nums">
                    {line.discountAmount > 0n
                      ? `−${formatMoney(line.discountAmount, invoice.currency)}`
                      : '—'}
                  </td>
                  <td className="px-3 py-4 text-right tabular-nums">
                    {line.taxAmount > 0n
                      ? formatMoney(line.taxAmount, invoice.currency)
                      : '—'}
                  </td>
                  <td className="px-3 py-4 text-right font-medium tabular-nums">
                    {formatMoney(line.totalAmount, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DocumentLines>

        <DocumentSummaryGrid>
          <DocumentNotes>
            {invoice.notes ? (
              <section>
                <h2 className="font-semibold">Note</h2>
                <p className="text-muted-foreground mt-2 text-pretty whitespace-pre-wrap print:text-neutral-700">
                  {invoice.notes}
                </p>
              </section>
            ) : null}
            {invoice.terms ? (
              <section>
                <h2 className="font-semibold">Terms and conditions</h2>
                <p className="text-muted-foreground mt-2 text-pretty whitespace-pre-wrap print:text-neutral-700">
                  {invoice.terms}
                </p>
              </section>
            ) : null}
          </DocumentNotes>

          <DocumentSummaryList>
            <DocumentSummaryRow
              label="Subtotal"
              value={formatMoney(invoice.subtotalAmount, invoice.currency)}
            />
            <DocumentSummaryRow
              label="Tax"
              value={formatMoney(invoice.taxAmount, invoice.currency)}
            />
            {invoice.discountAmount > 0n ? (
              <DocumentSummaryRow
                label="Invoice discount"
                value={`−${formatMoney(invoice.discountAmount, invoice.currency)}`}
              />
            ) : null}
            {invoice.shippingAmount > 0n ? (
              <DocumentSummaryRow
                label="Shipping"
                value={formatMoney(invoice.shippingAmount, invoice.currency)}
              />
            ) : null}
            {invoice.adjustmentAmount !== 0n ? (
              <DocumentSummaryRow
                label="Adjustment"
                value={formatMoney(invoice.adjustmentAmount, invoice.currency)}
              />
            ) : null}
            <DocumentSummaryRow
              label="Total"
              value={formatMoney(invoice.totalAmount, invoice.currency)}
              strong
            />
            {invoice.amountCredited > 0n ? (
              <DocumentSummaryRow
                label="Credits applied"
                value={`−${formatMoney(invoice.amountCredited, invoice.currency)}`}
              />
            ) : null}
            {invoice.amountPaid > 0n ? (
              <DocumentSummaryRow
                label="Payments received"
                value={`−${formatMoney(invoice.amountPaid, invoice.currency)}`}
              />
            ) : null}
            <DocumentTotalRow
              label="Amount due"
              value={formatMoney(invoice.amountDue, invoice.currency)}
            />
          </DocumentSummaryList>
        </DocumentSummaryGrid>

        <DocumentFooter>
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
        </DocumentFooter>
      </DocumentView>
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

function formatAddressLocality(address: {
  city: string | null
  state: string | null
  postalCode: string | null
  countryCode: string | null
}) {
  return [address.city, address.state, address.postalCode, address.countryCode]
    .filter(Boolean)
    .join(', ')
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

function invoiceAddressSnapshot(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const read = (key: string) =>
    typeof record[key] === 'string' ? record[key] : null

  return {
    attention: read('attention'),
    line1: read('line1'),
    line2: read('line2'),
    city: read('city'),
    state: read('state'),
    postalCode: read('postalCode'),
    countryCode: read('countryCode'),
  }
}
