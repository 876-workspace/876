'use client'

import { Input } from '@876/ui/input'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

export type DocumentPaymentTerm =
  | 'due-on-receipt'
  | 'net-15'
  | 'net-30'
  | 'net-45'
  | 'net-60'
  | 'end-of-month'
  | 'end-of-next-month'
  | 'custom'

export const DOCUMENT_PAYMENT_TERMS: readonly {
  value: DocumentPaymentTerm
  label: string
}[] = [
  { value: 'due-on-receipt', label: 'Due on receipt' },
  { value: 'net-15', label: 'Net 15' },
  { value: 'net-30', label: 'Net 30' },
  { value: 'net-45', label: 'Net 45' },
  { value: 'net-60', label: 'Net 60' },
  { value: 'end-of-month', label: 'Due end of the month' },
  { value: 'end-of-next-month', label: 'Due end of next month' },
  { value: 'custom', label: 'Custom' },
]

const NET_DAYS: Partial<Record<DocumentPaymentTerm, number>> = {
  'due-on-receipt': 0,
  'net-15': 15,
  'net-30': 30,
  'net-45': 45,
  'net-60': 60,
}

function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * The due date a term implies for an issue date, both as `YYYY-MM-DD` in UTC —
 * the same calendar the document timestamps are written in. Returns `null` for
 * a custom term or an unreadable issue date, leaving the typed due date alone.
 */
export function resolveTermDueDate(
  term: DocumentPaymentTerm,
  issueDate: string
): string | null {
  const issued = parseDateInput(issueDate)
  if (!issued || term === 'custom') return null

  const days = NET_DAYS[term]
  if (days !== undefined) {
    issued.setUTCDate(issued.getUTCDate() + days)
    return issued.toISOString().slice(0, 10)
  }

  const monthsAhead = term === 'end-of-month' ? 1 : 2
  // Day 0 of a month is the last day of the month before it.
  return new Date(
    Date.UTC(issued.getUTCFullYear(), issued.getUTCMonth() + monthsAhead, 0)
  )
    .toISOString()
    .slice(0, 10)
}

export interface DocumentPaymentTermsControlProps {
  idPrefix: string
  issueDate: string
  term: DocumentPaymentTerm
  dueDate: string
  onChange: (next: { term: DocumentPaymentTerm; dueDate: string }) => void
  disabled?: boolean
}

/** Terms and the due date they produce. Editing the date makes the term custom. */
export function DocumentPaymentTermsControl({
  idPrefix,
  issueDate,
  term,
  dueDate,
  onChange,
  disabled,
}: DocumentPaymentTermsControlProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <NativeSelect
        id={`${idPrefix}-terms`}
        aria-label="Payment terms"
        className="w-full"
        value={term}
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.value as DocumentPaymentTerm
          onChange({
            term: next,
            dueDate: resolveTermDueDate(next, issueDate) ?? dueDate,
          })
        }}
      >
        {DOCUMENT_PAYMENT_TERMS.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <div className="flex items-center gap-2">
        <label
          htmlFor={`${idPrefix}-due-date`}
          className="text-muted-foreground shrink-0 text-sm"
        >
          Due
        </label>
        <Input
          id={`${idPrefix}-due-date`}
          type="date"
          aria-label="Due date"
          value={dueDate}
          min={issueDate || undefined}
          disabled={disabled}
          onChange={(event) =>
            onChange({ term: 'custom', dueDate: event.target.value })
          }
        />
      </div>
    </div>
  )
}
