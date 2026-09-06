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
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

/**
 * One editable row. Amounts are the raw strings the person typed, so a
 * half-finished entry survives a re-render instead of snapping to a parsed
 * value mid-keystroke.
 */
export interface DocumentLineDraft {
  /** Stable client-side key. Not the persisted line id. */
  id: string
  itemId?: string | null
  /** Catalogue price this line was priced from, when one was selected. */
  priceId?: string | null
  /** The `value` of the chosen `DocumentItemOption`, or '' for a free-text line. */
  selectionId?: string
  description: string
  quantity: string
  unitAmount: string
  taxAmount?: string
  /**
   * The raw typed discount. Read as a percentage when `discountType` is
   * `PERCENTAGE`, and as a money amount otherwise.
   */
  discountAmount?: string
  discountType?: DocumentLineDiscountType
  /**
   * Subtotal in major units, resolved by the server's pricing module for a
   * catalogue line. Tiered and volume prices cannot be reproduced from
   * quantity times rate, so when this is set it replaces that product.
   */
  resolvedSubtotal?: string | null
}

export type DocumentLineDiscountType = 'AMOUNT' | 'PERCENTAGE'

/** One selectable catalogue entry: a plain item, or an item at a given price. */
export interface DocumentItemOption {
  value: string
  label: string
  itemId: string | null
  priceId: string | null
  /** Unit amount in major units, prefilled on selection. */
  defaultAmount: string | null
  currency: string | null
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

  /**
   * Catalogue entries. Passing them adds a leading Item column; omitting them
   * leaves every line free-text, which is all Invoice needs.
   */
  items?: readonly DocumentItemOption[]

  /**
   * Locks the rate cell for a catalogue line, because a price list prices it
   * server-side. The host sets `resolvedSubtotal` when that resolution lands.
   */
  priceListActive?: boolean

  /** Adds the percent/amount toggle to the discount cell. */
  allowPercentageDiscount?: boolean
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

/** Percentages are carried as basis points, so 12.5% is 1250 and never 0.125. */
const PERCENT_SCALE = 10_000n
const PERCENT_DIGITS = 2

/**
 * Resolves a line's discount to minor units.
 *
 * A percentage is taken against the line's own subtotal using the same
 * basis-point arithmetic the submitted document uses, so the running total a
 * person reads cannot disagree with the document the service writes.
 */
export function resolveLineDiscount(
  line: Pick<DocumentLineDraft, 'discountAmount' | 'discountType'>,
  subtotalAmount: bigint,
  minorUnitDigits: number
): bigint {
  const typed = line.discountAmount ?? ''

  if (line.discountType === 'PERCENTAGE') {
    const basisPoints = parseDecimalToMinorUnits(typed, PERCENT_DIGITS)
    if (basisPoints === null || basisPoints < 0n) return 0n
    return (subtotalAmount * basisPoints) / PERCENT_SCALE
  }

  return parseDecimalToMinorUnits(typed, minorUnitDigits) ?? 0n
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

  // A catalogue line's subtotal comes from the server's pricing module; a
  // tiered price is not quantity times rate, so recomputing it here would
  // quietly show a different number from the one that gets billed.
  const resolved =
    line.resolvedSubtotal === null || line.resolvedSubtotal === undefined
      ? null
      : parseDecimalToMinorUnits(line.resolvedSubtotal, minorUnitDigits)

  const subtotalAmount =
    resolved ??
    (unitAmount !== null && Number.isInteger(quantity) && quantity >= 0
      ? unitAmount * BigInt(quantity)
      : 0n)

  return {
    subtotalAmount,
    taxAmount:
      parseDecimalToMinorUnits(line.taxAmount ?? '', minorUnitDigits) ?? 0n,
    discountAmount: resolveLineDiscount(line, subtotalAmount, minorUnitDigits),
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
  items,
  priceListActive = false,
  allowPercentageDiscount = false,
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

  function selectItem(index: number, selectionId: string) {
    const option = items?.find((entry) => entry.value === selectionId)

    update(index, {
      selectionId,
      itemId: option?.itemId ?? null,
      priceId: option?.priceId ?? null,
      // The previous resolution belonged to the previous price. Clearing it
      // lets the host re-resolve rather than showing a stale subtotal.
      resolvedSubtotal: null,
      description: option?.label ?? lines[index]?.description ?? '',
      unitAmount: option?.defaultAmount ?? lines[index]?.unitAmount ?? '',
    })
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs">
              {items ? (
                <th className="w-48 py-2 pr-3 font-medium">Item</th>
              ) : null}
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
                {items ? (
                  <td className="py-2 pr-3">
                    <NativeSelect
                      aria-label={`Line ${index + 1} item`}
                      value={line.selectionId ?? ''}
                      disabled={readOnly}
                      onChange={(event) =>
                        selectItem(index, event.target.value)
                      }
                    >
                      <NativeSelectOption value="">
                        Custom line
                      </NativeSelectOption>
                      {items.map((option) => (
                        <NativeSelectOption
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </td>
                ) : null}
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
                    disabled={
                      readOnly || (priceListActive && Boolean(line.priceId))
                    }
                    onChange={(event) =>
                      update(index, {
                        unitAmount: event.target.value,
                        resolvedSubtotal: null,
                      })
                    }
                  />
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-1">
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
                    {allowPercentageDiscount ? (
                      <NativeSelect
                        aria-label={`Line ${index + 1} discount type`}
                        className="w-20"
                        value={line.discountType ?? 'AMOUNT'}
                        disabled={readOnly}
                        onChange={(event) =>
                          update(index, {
                            discountType: event.target
                              .value as DocumentLineDiscountType,
                          })
                        }
                      >
                        <NativeSelectOption value="AMOUNT">
                          Amount
                        </NativeSelectOption>
                        <NativeSelectOption value="PERCENTAGE">
                          Percent
                        </NativeSelectOption>
                      </NativeSelect>
                    ) : null}
                  </div>
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
