import type { ReactNode } from 'react'
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
import { cn } from '@876/ui/lib/utils'

import {
  documentStatusVariant,
  type DocumentStatusVariant,
} from '../document-status'

export interface InvoiceDocumentSeller {
  name: string
  countryLabel: string | null
  /** The organization's uploaded logo. The name alone renders when absent. */
  logoUrl?: string | null
  email?: string | null
  phone?: string | null
  address?: {
    line1: string | null
    line2: string | null
    city: string | null
    countryLabel: string | null
  } | null
}

export interface InvoiceDocumentPanelProps {
  seller: InvoiceDocumentSeller
  invoice: {
    number: string
    status: string
    subject: string | null
    subtotalAmount: string
    taxAmount: string
    discountAmount: string | null
    shippingAmount: string | null
    adjustmentAmount: string | null
    totalAmount: string
    amountCredited: string | null
    amountPaid: string | null
    amountDue: string
    notes: string | null
    terms: string | null
    lines: Array<{
      id: string
      description: string
      quantity: number
      servicePeriod: string | null
      unitAmount: string
      discountAmount: string | null
      taxAmount: string | null
      totalAmount: string
    }>
  }
  recipient: {
    name: string
    email: string | null
    phone: string | null
    address: {
      attention: string | null
      line1: string | null
      line2: string | null
      city: string | null
      state: string | null
      postalCode: string | null
      countryCode: string | null
    } | null
  }
  meta: Array<{ label: string; value: string | null }>
  footer: ReactNode
}

export function InvoiceDocumentPanel({
  seller,
  invoice,
  recipient,
  meta,
  footer,
}: InvoiceDocumentPanelProps) {
  const address = recipient.address
  // Driven by this invoice's own snapshotted lines, so a finalized document
  // always renders the same columns however the org's tax or discount setup
  // changes later.
  const showDiscount = invoice.lines.some((line) =>
    Boolean(line.discountAmount)
  )
  const showTax = invoice.lines.some((line) => Boolean(line.taxAmount))
  return (
    <DocumentView className="relative">
      <DocumentStatusRibbon status={invoice.status} />
      <DocumentHeader className="pt-16">
        <DocumentHeaderTop>
          <div>
            {seller.logoUrl ? (
              <img
                src={seller.logoUrl}
                alt=""
                className="mb-4 h-12 w-auto max-w-48 object-contain object-left print:h-10"
              />
            ) : null}
            <p className="text-xl font-semibold">{seller.name}</p>
            <SellerDetails seller={seller} />
          </div>
          <DocumentTitle>
            <p className="text-3xl font-semibold tracking-tight">INVOICE</p>
            <p className="mt-2 font-medium tabular-nums">#{invoice.number}</p>
            <div className="mt-5">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase print:text-neutral-600">
                Balance due
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {invoice.amountDue}
              </p>
            </div>
            {invoice.subject ? (
              <p className="mt-3 max-w-sm text-sm font-medium text-pretty">
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
            <p className="font-semibold">{recipient.name}</p>
            {address?.attention ? <p>{address.attention}</p> : null}
            {address?.line1 ? <p>{address.line1}</p> : null}
            {address?.line2 ? <p>{address.line2}</p> : null}
            {address ? (
              <p>
                {[
                  address.city,
                  address.state,
                  address.postalCode,
                  address.countryCode,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            ) : null}
            {recipient.email ? <p>{recipient.email}</p> : null}
            {recipient.phone ? <p>{recipient.phone}</p> : null}
          </div>
        </DocumentRecipient>

        <DocumentMetaList>
          {meta.map(({ label, value }) =>
            value ? (
              <DocumentMeta key={label} label={label} value={value} />
            ) : null
          )}
        </DocumentMetaList>
      </DocumentDetailsGrid>

      <DocumentLines>
        <table
          className={cn(
            'w-full text-sm',
            // Only as wide as the columns this invoice actually uses. A fixed
            // 680px floor forced a horizontal scrollbar in the detail column
            // even when two of the six columns held nothing but em dashes.
            showDiscount && showTax
              ? 'min-w-[680px]'
              : showDiscount || showTax
                ? 'min-w-[580px]'
                : 'min-w-[480px]'
          )}
        >
          <thead>
            <tr className="border-border bg-muted/40 text-muted-foreground border-y print:border-neutral-200 print:bg-neutral-50 print:text-neutral-700">
              <th className="px-3 py-3 text-left font-medium">Description</th>
              <th className="px-3 py-3 text-right font-medium">Qty</th>
              <th className="px-3 py-3 text-right font-medium">Rate</th>
              {showDiscount ? (
                <th className="px-3 py-3 text-right font-medium">Discount</th>
              ) : null}
              {showTax ? (
                <th className="px-3 py-3 text-right font-medium">Tax</th>
              ) : null}
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
                  {line.servicePeriod ? (
                    <p className="text-muted-foreground mt-1 text-xs print:text-neutral-600">
                      {line.servicePeriod}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-4 text-right tabular-nums">
                  {line.quantity}
                </td>
                <td className="px-3 py-4 text-right tabular-nums">
                  {line.unitAmount}
                </td>
                {showDiscount ? (
                  <td className="px-3 py-4 text-right tabular-nums">
                    {line.discountAmount ? `−${line.discountAmount}` : '—'}
                  </td>
                ) : null}
                {showTax ? (
                  <td className="px-3 py-4 text-right tabular-nums">
                    {line.taxAmount ? line.taxAmount : '—'}
                  </td>
                ) : null}
                <td className="px-3 py-4 text-right font-medium tabular-nums">
                  {line.totalAmount}
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
          <DocumentSummaryRow label="Subtotal" value={invoice.subtotalAmount} />
          <DocumentSummaryRow label="Tax" value={invoice.taxAmount} />
          {invoice.discountAmount ? (
            <DocumentSummaryRow
              label="Invoice discount"
              value={`−${invoice.discountAmount}`}
            />
          ) : null}
          {invoice.shippingAmount ? (
            <DocumentSummaryRow
              label="Shipping"
              value={invoice.shippingAmount}
            />
          ) : null}
          {invoice.adjustmentAmount ? (
            <DocumentSummaryRow
              label="Adjustment"
              value={invoice.adjustmentAmount}
            />
          ) : null}
          <DocumentSummaryRow
            label="Total"
            value={invoice.totalAmount}
            strong
          />
          {invoice.amountCredited ? (
            <DocumentSummaryRow
              label="Credits applied"
              value={`−${invoice.amountCredited}`}
            />
          ) : null}
          {invoice.amountPaid ? (
            <DocumentSummaryRow
              label="Payments received"
              value={`−${invoice.amountPaid}`}
            />
          ) : null}
          <DocumentTotalRow label="Amount due" value={invoice.amountDue} />
        </DocumentSummaryList>
      </DocumentSummaryGrid>

      <DocumentFooter>{footer}</DocumentFooter>
    </DocumentView>
  )
}

function SellerDetails({ seller }: { seller: InvoiceDocumentSeller }) {
  const address = seller.address
  // The country falls back to the seller's own label, so an organization with
  // no address on file still shows where it trades from.
  const cityLine = [address?.city, address?.countryLabel ?? seller.countryLabel]
    .filter(Boolean)
    .join(', ')
  if (
    !address?.line1 &&
    !address?.line2 &&
    !cityLine &&
    !seller.phone &&
    !seller.email
  )
    return null

  return (
    <div className="text-muted-foreground mt-1 text-sm leading-6 print:text-neutral-600">
      {address?.line1 ? <p>{address.line1}</p> : null}
      {address?.line2 ? <p>{address.line2}</p> : null}
      {cityLine ? <p>{cityLine}</p> : null}
      {seller.phone ? <p>{seller.phone}</p> : null}
      {seller.email ? <p>{seller.email}</p> : null}
    </div>
  )
}

/**
 * Solid status colours for the corner ribbon. Keyed by the shared document
 * variant, so the ribbon can never disagree with the status badge elsewhere.
 */
const RIBBON_BACKGROUND: Record<DocumentStatusVariant, string> = {
  default: 'bg-muted-foreground',
  secondary: 'bg-muted-foreground',
  outline: 'bg-muted-foreground',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
}

/**
 * The diagonal status ribbon in the document's top-left corner. It replaces a
 * second status line inside the header, and the header carries `pt-16` so the
 * ribbon's band cannot reach the seller logo or name beneath it.
 */
function DocumentStatusRibbon({ status }: { status: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-0 left-0 size-24 overflow-hidden print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]"
      data-document-ribbon={status}
    >
      <span
        className={cn(
          'absolute top-5 -left-10 w-36 -rotate-45 py-1 text-center text-[0.625rem] font-semibold tracking-wider text-white uppercase',
          RIBBON_BACKGROUND[documentStatusVariant(status)]
        )}
      >
        {status.toLowerCase().replaceAll('_', ' ')}
      </span>
    </div>
  )
}
