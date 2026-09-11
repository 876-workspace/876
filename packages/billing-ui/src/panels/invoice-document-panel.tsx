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

export interface InvoiceDocumentPanelProps {
  seller: { name: string; countryLabel: string }
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
  return (
    <DocumentView>
      <DocumentHeader>
        <DocumentHeaderTop>
          <div>
            <p className="text-xl font-semibold">{seller.name}</p>
            <p className="text-muted-foreground mt-1 text-sm print:text-neutral-600">
              {seller.countryLabel}
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
                <td className="px-3 py-4 text-right tabular-nums">
                  {line.discountAmount ? `−${line.discountAmount}` : '—'}
                </td>
                <td className="px-3 py-4 text-right tabular-nums">
                  {line.taxAmount ? line.taxAmount : '—'}
                </td>
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
