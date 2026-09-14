'use client'

import type { ReactNode } from 'react'
import { parseDecimalToMinorUnits } from '@876/core/money'
import { Input } from '@876/ui/input'
import { cn } from '@876/ui/lib/utils'

import type { DocumentTotalsSnapshot } from './document-line-items-editor'

/** The raw typed document-level amounts, in major units. */
export interface DocumentAdjustmentDraft {
  discount: string
  shipping: string
  adjustment: string
}

export interface DocumentAdjustmentsControl {
  values: DocumentAdjustmentDraft
  onChange: (patch: Partial<DocumentAdjustmentDraft>) => void
  disabled?: boolean
}

export interface DocumentTotalsSummaryProps {
  snapshot: DocumentTotalsSnapshot | null
  formatAmount: (minorUnits: bigint) => string
  /** Shown beside the grand total, e.g. `JMD`. */
  currency?: string
  /** Makes discount, shipping, and adjustment editable inside the summary. */
  adjustments?: DocumentAdjustmentsControl
  idPrefix?: string
  className?: string
}

/**
 * Parses the typed document-level amounts. A blank field is zero; anything
 * unreadable is `null`, so the host can refuse to submit it. Adjustment is the
 * only one allowed to be negative.
 */
export function parseDocumentAdjustments(
  values: DocumentAdjustmentDraft,
  minorUnitDigits: number
): { discount: bigint; shipping: bigint; adjustment: bigint } | null {
  const read = (value: string) =>
    value.trim() === '' ? 0n : parseDecimalToMinorUnits(value, minorUnitDigits)
  const discount = read(values.discount)
  const shipping = read(values.shipping)
  const adjustment = read(values.adjustment)
  if (
    discount === null ||
    shipping === null ||
    adjustment === null ||
    discount < 0n ||
    shipping < 0n
  )
    return null

  return { discount, shipping, adjustment }
}

/**
 * The running totals panel beside a document's line items. The numbers come
 * from the editor's snapshot, which already folds in the document-level
 * amounts, so this panel can never show a total the editor disagrees with.
 */
export function DocumentTotalsSummary({
  snapshot,
  formatAmount,
  currency,
  adjustments,
  idPrefix = 'document',
  className,
}: DocumentTotalsSummaryProps) {
  const totals = snapshot?.status === 'ready' ? snapshot.totals : null

  return (
    <dl
      className={cn('bg-muted/40 space-y-3 rounded-lg p-4 text-sm', className)}
    >
      <Row label="Sub total" testId="total-subtotal" strong>
        {amount(totals?.subtotalAmount, formatAmount)}
      </Row>

      {totals && totals.lineDiscountAmount > 0n ? (
        <Row label="Line discounts" testId="total-line-discounts" muted>
          −{formatAmount(totals.lineDiscountAmount)}
        </Row>
      ) : null}

      {adjustments ? (
        <>
          <AdjustmentRow
            id={`${idPrefix}-discount`}
            label="Discount"
            value={adjustments.values.discount}
            disabled={adjustments.disabled}
            onChange={(discount) => adjustments.onChange({ discount })}
            result={
              totals && totals.discountAmount > 0n
                ? `−${formatAmount(totals.discountAmount)}`
                : amount(totals?.discountAmount, formatAmount)
            }
          />
          <AdjustmentRow
            id={`${idPrefix}-shipping`}
            label="Shipping"
            value={adjustments.values.shipping}
            disabled={adjustments.disabled}
            onChange={(shipping) => adjustments.onChange({ shipping })}
            result={amount(totals?.shippingAmount, formatAmount)}
          />
          <AdjustmentRow
            id={`${idPrefix}-adjustment`}
            label="Adjustment"
            value={adjustments.values.adjustment}
            disabled={adjustments.disabled}
            onChange={(adjustment) => adjustments.onChange({ adjustment })}
            result={amount(totals?.adjustmentAmount, formatAmount)}
            allowNegative
          />
        </>
      ) : null}

      <Row label="Tax" testId="total-tax">
        {amount(totals?.taxAmount, formatAmount)}
      </Row>

      <div className="border-border flex items-baseline justify-between gap-6 border-t pt-3">
        <dt className="text-base font-semibold">
          Total{currency ? ` (${currency})` : ''}
        </dt>
        <dd
          className="text-base font-semibold tabular-nums"
          data-testid="total-total"
        >
          {amount(totals?.totalAmount, formatAmount)}
        </dd>
      </div>
    </dl>
  )
}

function amount(
  value: bigint | undefined,
  formatAmount: (minorUnits: bigint) => string
) {
  return value === undefined ? '—' : formatAmount(value)
}

function Row({
  label,
  testId,
  strong = false,
  muted = false,
  children,
}: {
  label: string
  testId: string
  strong?: boolean
  muted?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <dt
        className={cn(
          strong ? 'font-medium' : 'text-muted-foreground',
          muted && 'text-xs'
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          'tabular-nums',
          strong && 'font-medium',
          muted && 'text-muted-foreground text-xs'
        )}
        data-testid={testId}
      >
        {children}
      </dd>
    </div>
  )
}

function AdjustmentRow({
  id,
  label,
  value,
  onChange,
  result,
  disabled,
  allowNegative = false,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  result: string
  disabled?: boolean
  allowNegative?: boolean
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_7rem_minmax(5rem,auto)] items-center gap-3">
      <dt>
        <label htmlFor={id} className="text-muted-foreground">
          {label}
        </label>
      </dt>
      <Input
        id={id}
        inputMode="decimal"
        placeholder="0.00"
        className="bg-background h-8 text-right tabular-nums"
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.value
          if (!allowNegative && next.includes('-')) return
          onChange(next)
        }}
      />
      <dd className="text-right tabular-nums">{result}</dd>
    </div>
  )
}
