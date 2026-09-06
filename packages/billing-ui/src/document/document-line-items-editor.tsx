'use client'

import { useEffect, useMemo, type ReactNode } from 'react'
import {
  calculateDocumentTotals,
  formatMinorUnits,
  parseDecimalToMinorUnits,
  type DocumentTotals,
} from '@876/core/money'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Plus, Trash } from '@876/ui/icons'

/**
 * One editable row. Amounts are the raw strings the person typed, so a
 * half-finished entry survives a re-render instead of snapping to a parsed
 * value mid-keystroke.
 */
export interface DocumentLineDraft {
  /** Stable client-side key. Not the persisted line id. */
  id: string
  itemId?: string | null
  description: string
  quantity: string
  unitAmount: string
  taxAmount?: string
  discountAmount?: string
}

export interface DocumentLineItemsEditorProps {
  lines: readonly DocumentLineDraft[]
  onChange: (lines: DocumentLineDraft[]) => void

  /** Minor-unit digits for the document currency. JMD and USD are 2. */
  minorUnitDigits?: number

  /** Renders a resolved total for display. The host knows the viewer's locale. */
  formatAmount: (minorUnits: bigint) => string

  readOnly?: boolean

  /** Document-level amounts, in minor units, folded into the total. */
  discountAmount?: bigint
  shippingAmount?: bigint
  adjustmentAmount?: bigint

  /**
   * Extra columns. Billing uses this for proration and subscription period;
   * Invoice passes none. A variation is a slot, never a forked editor.
   */
  extraColumns?: readonly DocumentLineColumn[]

  /** Extra controls in a row's action cell, beside remove. */
  renderRowActions?: (line: DocumentLineDraft, index: number) => ReactNode

  /** Rendered under the totals — terms, notes, a tax-behaviour selector. */
  footer?: ReactNode

  /** Reported on every change so the host can gate submission. */
  onTotalsChange?: (totals: DocumentTotalsSnapshot) => void
}

export interface DocumentLineColumn {
  key: string
  header: string
  /** Right-align numeric columns so digits line up. */
  align?: 'left' | 'right'
  render: (line: DocumentLineDraft, index: number) => ReactNode
}

export type DocumentTotalsSnapshot =
  | { status: 'ready'; totals: DocumentTotals }
  | { status: 'invalid'; message: string; lineIndex?: number }

function emptyLine(id: string): DocumentLineDraft {
  return { id, description: '', quantity: '1', unitAmount: '' }
}

/**
 * Resolves a draft row to minor units. A blank or unparseable amount reads as
 * zero for the running total — a person mid-entry should see a total, not an
 * error — while `parseDecimalToMinorUnits` still refuses anything it cannot
 * represent exactly, so a truncated amount never reaches the arithmetic.
 */
function resolveLine(line: DocumentLineDraft, minorUnitDigits: number) {
  const quantity = Number(line.quantity)
  const unitAmount = parseDecimalToMinorUnits(line.unitAmount, minorUnitDigits)
  const subtotalAmount =
    unitAmount !== null && Number.isInteger(quantity) && quantity >= 0
      ? unitAmount * BigInt(quantity)
      : 0n

  return {
    subtotalAmount,
    taxAmount:
      parseDecimalToMinorUnits(line.taxAmount ?? '', minorUnitDigits) ?? 0n,
    discountAmount:
      parseDecimalToMinorUnits(line.discountAmount ?? '', minorUnitDigits) ??
      0n,
  }
}

export function DocumentLineItemsEditor({
  lines,
  onChange,
  minorUnitDigits = 2,
  formatAmount,
  readOnly = false,
  discountAmount,
  shippingAmount,
  adjustmentAmount,
  extraColumns = [],
  renderRowActions,
  footer,
  onTotalsChange,
}: DocumentLineItemsEditorProps) {
  const resolved = useMemo(
    () => lines.map((line) => resolveLine(line, minorUnitDigits)),
    [lines, minorUnitDigits]
  )

  const result = useMemo(
    () =>
      calculateDocumentTotals({
        lines: resolved,
        discountAmount,
        shippingAmount,
        adjustmentAmount,
      }),
    [resolved, discountAmount, shippingAmount, adjustmentAmount]
  )

  const snapshot = useMemo<DocumentTotalsSnapshot>(
    () =>
      result.error === null
        ? { status: 'ready', totals: result.data }
        : {
            status: 'invalid',
            message: result.error.message,
            lineIndex: result.error.lineIndex,
          },
    [result]
  )

  // Reported from an effect, not during render: a host that stores the
  // snapshot in state would otherwise re-render this component from inside its
  // own render pass.
  useEffect(() => {
    onTotalsChange?.(snapshot)
  }, [snapshot, onTotalsChange])

  function update(index: number, patch: Partial<DocumentLineDraft>) {
    onChange(
      lines.map((line, position) =>
        position === index ? { ...line, ...patch } : line
      )
    )
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs">
              <th className="py-2 pr-3 font-medium">Description</th>
              <th className="w-24 py-2 pr-3 text-right font-medium">Qty</th>
              <th className="w-32 py-2 pr-3 text-right font-medium">Rate</th>
              <th className="w-32 py-2 pr-3 text-right font-medium">
                Discount
              </th>
              <th className="w-32 py-2 pr-3 text-right font-medium">Tax</th>
              {extraColumns.map((column) => (
                <th
                  key={column.key}
                  className={`py-2 pr-3 font-medium ${
                    column.align === 'right' ? 'text-right' : ''
                  }`}
                >
                  {column.header}
                </th>
              ))}
              <th className="w-32 py-2 pr-3 text-right font-medium">Amount</th>
              {readOnly ? null : <th className="w-10 py-2" />}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.id} className="border-b last:border-0">
                <td className="py-2 pr-3">
                  <Input
                    aria-label={`Line ${index + 1} description`}
                    value={line.description}
                    disabled={readOnly}
                    onChange={(event) =>
                      update(index, { description: event.target.value })
                    }
                  />
                </td>
                <td className="py-2 pr-3">
                  <Input
                    aria-label={`Line ${index + 1} quantity`}
                    inputMode="numeric"
                    className="text-right tabular-nums"
                    value={line.quantity}
                    disabled={readOnly}
                    onChange={(event) =>
                      update(index, { quantity: event.target.value })
                    }
                  />
                </td>
                <td className="py-2 pr-3">
                  <Input
                    aria-label={`Line ${index + 1} rate`}
                    inputMode="decimal"
                    className="text-right tabular-nums"
                    value={line.unitAmount}
                    disabled={readOnly}
                    onChange={(event) =>
                      update(index, { unitAmount: event.target.value })
                    }
                  />
                </td>
                <td className="py-2 pr-3">
                  <Input
                    aria-label={`Line ${index + 1} discount`}
                    inputMode="decimal"
                    className="text-right tabular-nums"
                    value={line.discountAmount ?? ''}
                    disabled={readOnly}
                    onChange={(event) =>
                      update(index, { discountAmount: event.target.value })
                    }
                  />
                </td>
                <td className="py-2 pr-3">
                  <Input
                    aria-label={`Line ${index + 1} tax`}
                    inputMode="decimal"
                    className="text-right tabular-nums"
                    value={line.taxAmount ?? ''}
                    disabled={readOnly}
                    onChange={(event) =>
                      update(index, { taxAmount: event.target.value })
                    }
                  />
                </td>
                {extraColumns.map((column) => (
                  <td
                    key={column.key}
                    className={`py-2 pr-3 ${
                      column.align === 'right' ? 'text-right' : ''
                    }`}
                  >
                    {column.render(line, index)}
                  </td>
                ))}
                <td
                  className="py-2 pr-3 text-right tabular-nums"
                  data-testid={`line-total-${index}`}
                >
                  {formatAmount(
                    snapshot.status === 'ready'
                      ? (snapshot.totals.lines[index]?.totalAmount ?? 0n)
                      : 0n
                  )}
                </td>
                {readOnly ? null : (
                  <td className="py-2">
                    <div className="flex items-center justify-end gap-1">
                      {renderRowActions?.(line, index)}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove line ${index + 1}`}
                        onClick={() =>
                          onChange(
                            lines.filter((_, position) => position !== index)
                          )
                        }
                      >
                        <Trash className="size-4" />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {readOnly ? null : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...lines,
              emptyLine(`line-${Date.now()}-${lines.length}`),
            ])
          }
        >
          <Plus className="size-3.5" />
          Add line
        </Button>
      )}

      <dl className="ml-auto max-w-xs space-y-1 text-sm">
        <Total
          label="Subtotal"
          value={
            snapshot.status === 'ready' ? snapshot.totals.subtotalAmount : null
          }
          formatAmount={formatAmount}
        />
        <Total
          label="Tax"
          value={snapshot.status === 'ready' ? snapshot.totals.taxAmount : null}
          formatAmount={formatAmount}
        />
        <Total
          label="Total"
          value={
            snapshot.status === 'ready' ? snapshot.totals.totalAmount : null
          }
          formatAmount={formatAmount}
          emphasis
        />
      </dl>

      {snapshot.status === 'invalid' ? (
        <p role="alert" className="text-destructive text-sm">
          {snapshot.message}
        </p>
      ) : null}

      {footer}
    </div>
  )
}

function Total({
  label,
  value,
  formatAmount,
  emphasis = false,
}: {
  label: string
  value: bigint | null
  formatAmount: (minorUnits: bigint) => string
  emphasis?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <dt className={emphasis ? 'font-medium' : 'text-muted-foreground'}>
        {label}
      </dt>
      <dd
        className={`tabular-nums ${emphasis ? 'font-medium' : ''}`}
        data-testid={`total-${label.toLowerCase()}`}
      >
        {value === null ? '—' : formatAmount(value)}
      </dd>
    </div>
  )
}

export { formatMinorUnits }
