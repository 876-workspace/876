import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@876/ui/accordion'
import { Badge } from '@876/ui/badge'

import { Link } from '../link'

import { PanelError, PanelFrame, PanelRowsSkeleton } from './panel-frame'
import type { PanelProps, PanelState } from './panel'

export interface InvoicePaymentRow {
  id: string
  date: string
  number: string
  reference: string | null
  mode: string
  amount: string
  status: string
}

export interface InvoiceCreditNoteRow {
  id: string
  date: string
  number: string
  amount: string
}

export interface InvoicePaymentsPanelData {
  payments: InvoicePaymentRow[]
  creditNotes: InvoiceCreditNoteRow[]
}

export interface InvoicePaymentsPanelProps extends PanelProps {
  title: string
  state: PanelState<InvoicePaymentsPanelData>
  hrefForPayment: (id: string) => string
  hrefForCreditNote?: (id: string) => string
}

export function InvoicePaymentsPanel({
  title,
  state,
  hrefForPayment,
  hrefForCreditNote,
  ...props
}: InvoicePaymentsPanelProps) {
  const count = state.status === 'ready' ? state.data.payments.length : 0

  // An invoice nobody has paid yet has no ledger to show. Rendering an empty
  // "Payments received 0" card on every unpaid invoice is noise above the
  // document it is meant to annotate, so the section appears once there is
  // something in it. A failed load still surfaces — silence there would be
  // indistinguishable from "no payments".
  const nothingToShow =
    state.status === 'empty' ||
    (state.status === 'ready' &&
      !state.data.payments.length &&
      !state.data.creditNotes.length)
  if (nothingToShow) return null

  return (
    <Accordion className="print:hidden" defaultValue={['payments']}>
      <AccordionItem value="payments">
        <PanelFrame
          title={
            <AccordionTrigger className="items-center py-0 hover:no-underline">
              <span className="flex items-center gap-2">
                {title}
                <Badge variant="secondary">{count}</Badge>
              </span>
            </AccordionTrigger>
          }
          {...props}
        >
          <AccordionContent className="pb-0">
            {state.status === 'ready' ? (
              <div className="space-y-6">
                {state.data.payments.length ? (
                  <PaymentRows
                    rows={state.data.payments}
                    hrefForPayment={hrefForPayment}
                  />
                ) : null}
                {state.data.creditNotes.length ? (
                  <CreditNoteRows
                    rows={state.data.creditNotes}
                    hrefForCreditNote={hrefForCreditNote}
                  />
                ) : null}
              </div>
            ) : (
              <PanelError error={state} />
            )}
          </AccordionContent>
        </PanelFrame>
      </AccordionItem>
    </Accordion>
  )
}

export function InvoicePaymentsPanelSkeleton() {
  return (
    <PanelFrame title="Payments received" className="print:hidden">
      <PanelRowsSkeleton rows={4} />
    </PanelFrame>
  )
}

function PaymentRows({
  rows,
  hrefForPayment,
}: {
  rows: InvoicePaymentRow[]
  hrefForPayment: (id: string) => string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="text-muted-foreground border-b text-left text-xs">
          <tr>
            <th className="pb-3 font-medium">DATE</th>
            <th className="pb-3 font-medium">PAYMENT #</th>
            <th className="pb-3 font-medium">REFERENCE#</th>
            <th className="pb-3 font-medium">STATUS</th>
            <th className="pb-3 font-medium">PAYMENT MODE</th>
            <th className="pb-3 text-right font-medium">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((payment) => (
            <tr key={payment.id} className="border-b last:border-0">
              <td className="py-3">{payment.date}</td>
              <td className="py-3 font-medium">
                <Link
                  href={hrefForPayment(payment.id)}
                  className="text-primary hover:underline"
                >
                  {payment.number}
                </Link>
              </td>
              <td className="py-3">
                {payment.reference ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-3">
                <Badge variant="secondary">{payment.status}</Badge>
              </td>
              <td className="py-3">{payment.mode}</td>
              <td className="py-3 text-right tabular-nums">{payment.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CreditNoteRows({
  rows,
  hrefForCreditNote,
}: {
  rows: InvoiceCreditNoteRow[]
  hrefForCreditNote?: (id: string) => string
}) {
  return (
    <div className="overflow-x-auto">
      <h3 className="text-sm font-semibold">Credit notes applied</h3>
      <table className="mt-3 w-full min-w-[480px] text-sm">
        <thead className="text-muted-foreground border-b text-left text-xs">
          <tr>
            <th className="pb-3 font-medium">DATE</th>
            <th className="pb-3 font-medium">CREDIT NOTE</th>
            <th className="pb-3 text-right font-medium">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((creditNote) => (
            <tr key={creditNote.id} className="border-b last:border-0">
              <td className="py-3">{creditNote.date}</td>
              <td className="py-3 font-medium">
                {hrefForCreditNote ? (
                  <Link
                    href={hrefForCreditNote(creditNote.id)}
                    className="text-primary hover:underline"
                  >
                    {creditNote.number}
                  </Link>
                ) : (
                  creditNote.number
                )}
              </td>
              <td className="py-3 text-right tabular-nums">
                {creditNote.amount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
