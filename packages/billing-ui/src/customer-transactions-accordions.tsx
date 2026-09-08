import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@876/ui/accordion'
import { Badge } from '@876/ui/badge'
import { ChevronDownIcon, ChevronRightIcon } from '@876/ui/icons'

import { Link } from './link'

export interface CustomerTransactionEntry {
  id: string
  type: string
  direction: 'DEBIT' | 'CREDIT'
  amount: string
  currency: string
  description: string | null
  effectiveAt: number
  invoiceId: string | null
  paymentId: string | null
  creditNoteId: string | null
  refundId: string | null
}

export interface CustomerTransactionsAccordionsProps {
  entries: CustomerTransactionEntry[]
  currencyDecimals: Record<string, number>
  hrefByEntryId?: Record<string, string>
  includeCreditNotes?: boolean
}

interface SectionDefinition {
  id: string
  label: string
  types: ReadonlySet<string>
  creditNotes?: boolean
}

const SECTIONS: SectionDefinition[] = [
  {
    id: 'invoices',
    label: 'Invoices',
    types: new Set(['INVOICE_FINALIZED']),
  },
  {
    id: 'payments',
    label: 'Payments received',
    types: new Set(['PAYMENT_RECEIVED', 'PAYMENT_REVERSED']),
  },
  {
    id: 'credit-notes',
    label: 'Credit notes',
    types: new Set(['CREDIT_NOTE_ISSUED', 'CREDIT_NOTE_VOIDED']),
    creditNotes: true,
  },
  {
    id: 'refunds',
    label: 'Refunds',
    types: new Set(['REFUND_ISSUED']),
  },
  {
    id: 'adjustments',
    label: 'Adjustments',
    types: new Set(['WRITE_OFF', 'OPENING_BALANCE']),
  },
]

/** Accounting-backed customer activity shared by Billing and Invoice hosts. */
export function CustomerTransactionsAccordions({
  entries,
  currencyDecimals,
  hrefByEntryId = {},
  includeCreditNotes = false,
}: CustomerTransactionsAccordionsProps) {
  const sections = SECTIONS.filter(
    (section) => !section.creditNotes || includeCreditNotes
  )

  return (
    <Accordion multiple={false} className="gap-3">
      {sections.map((section) => {
        const rows = entries.filter((entry) => section.types.has(entry.type))
        return (
          <section
            key={section.id}
            className="border-876-surface-border overflow-hidden rounded-lg border"
          >
            <AccordionItem value={section.id} className="border-b-0">
              <AccordionTrigger className="bg-876-canvas aria-expanded:bg-876-surface aria-expanded:border-876-surface-border items-center rounded-none border-b border-transparent px-4 py-3 transition-colors hover:no-underline [&>[data-slot=accordion-trigger-icon]]:hidden">
                <span className="flex items-center gap-3">
                  <ChevronRightIcon className="text-muted-foreground size-4 group-aria-expanded/accordion-trigger:hidden" />
                  <ChevronDownIcon className="text-muted-foreground hidden size-4 group-aria-expanded/accordion-trigger:inline" />
                  <span className="text-sm font-semibold">{section.label}</span>
                  {rows.length > 0 ? (
                    <span className="text-muted-foreground text-xs font-normal">
                      {rows.length}
                    </span>
                  ) : null}
                </span>
              </AccordionTrigger>
              <AccordionContent className="bg-876-surface p-0">
                <TransactionTable
                  label={section.label}
                  rows={rows}
                  currencyDecimals={currencyDecimals}
                  hrefByEntryId={hrefByEntryId}
                />
              </AccordionContent>
            </AccordionItem>
          </section>
        )
      })}
    </Accordion>
  )
}

function TransactionTable({
  label,
  rows,
  currencyDecimals,
  hrefByEntryId,
}: {
  label: string
  rows: CustomerTransactionEntry[]
  currencyDecimals: Record<string, number>
  hrefByEntryId: Record<string, string>
}) {
  if (rows.length === 0)
    return (
      <p className="text-muted-foreground px-4 py-8 text-center text-sm">
        No {label.toLowerCase()} found.
      </p>
    )

  return (
    <div className="876-scroll overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-muted-foreground border-b text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Activity</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Direction</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => {
            const href = hrefByEntryId[entry.id]
            const activity = entry.description ?? formatActivity(entry.type)
            return (
              <tr key={entry.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">
                  {href ? (
                    <Link href={href} className="text-primary hover:underline">
                      {activity}
                    </Link>
                  ) : (
                    activity
                  )}
                </td>
                <td className="px-4 py-3">{formatDate(entry.effectiveAt)}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">
                    {entry.direction === 'DEBIT' ? 'Debit' : 'Credit'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {formatMinorAmount(
                    entry.amount,
                    entry.currency,
                    currencyDecimals[entry.currency] ?? 2
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function formatActivity(type: string): string {
  return type
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (character) => character.toUpperCase())
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-JM', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatMinorAmount(
  amount: string,
  currency: string,
  decimalPlaces: number
): string {
  const value = BigInt(amount)
  const negative = value < 0n
  const absolute = negative ? -value : value
  if (decimalPlaces === 0)
    return `${currency} ${negative ? '-' : ''}${absolute.toString()}`

  const scale = 10n ** BigInt(decimalPlaces)
  const whole = absolute / scale
  const fraction = (absolute % scale).toString().padStart(decimalPlaces, '0')
  return `${currency} ${negative ? '-' : ''}${whole}.${fraction}`
}
