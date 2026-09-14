'use client'

import { useEffect, useMemo, type ReactNode } from 'react'
import {
  calculateDocumentTotals,
  calculateTax,
  formatMinorUnits,
  parseDecimalToMinorUnits,
  resolvePercentageDiscount,
  PERCENT_DIGITS,
  type DocumentTotals,
} from '@876/core/money'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Plus, X } from '@876/ui/icons'
import { cn } from '@876/ui/lib/utils'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { AsyncCombobox, type AsyncComboboxOption } from '@876/ui/async-combobox'
import { SearchableSelect } from '@876/ui/searchable-select'

import { DocumentTotalsSummary } from './document-totals-summary'

/**
 * One editable row. Amounts are the raw strings the person typed, so a
 * half-finished entry survives a re-render instead of snapping to a parsed
 * value mid-keystroke.
 */
export interface DocumentLineDraft {
  /** Stable client-side key. Not the persisted line id. */
  id: string
  itemId?: string | null
  /** Required alongside itemId when the selected Item is variant-mode. */
  variantId?: string | null
  /** Catalogue price this line was priced from, when one was selected. */
  priceId?: string | null
  /** The `value` of the chosen `DocumentItemOption`, or '' for a free-text line. */
  selectionId?: string
  /** Stock metadata captured from the selected catalogue option for draft UX. */
  trackStock?: boolean
  stockQuantity?: number | null
  allowOutOfStock?: boolean
  description: string
  quantity: string
  unitAmount: string
  taxAmount?: string
  /** The organization tax rate charged on this line, when one was chosen. */
  taxRateId?: string | null
  /**
   * That rate as a percentage string (`"15.00"`). Carried on the line so the
   * tax is computed from the line itself, identically in the editor and the
   * payload, without a lookup.
   */
  taxRate?: string | null
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
  trackStock?: boolean
  stockQuantity?: number | null
  allowOutOfStock?: boolean
  variants?: readonly DocumentItemVariantOption[]
}

/** An exclusive organization tax rate a line may be charged at. */
export interface DocumentTaxRateOption {
  id: string
  label: string
  /** Percentage string, e.g. `"15.00"`. */
  rate: string
}

export interface DocumentItemVariantOption {
  id: string
  label: string
  sku: string | null
  defaultAmount: string | null
  trackStock?: boolean
  stockQuantity?: number | null
  allowOutOfStock?: boolean
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
   * Server-backed catalogue search. When supplied the Item column becomes a
   * typeahead whose box is the input, with `items` as its starting set, so a
   * tenant with a large catalogue is not shipped the whole thing up front.
   * It must forward the `AbortSignal` so a superseded query is cancelled.
   */
  onSearchItems?: (
    query: string,
    signal: AbortSignal
  ) => Promise<readonly DocumentItemOption[]>

  /**
   * Blocks a draft snapshot when tracked Item quantities exceed live stock and
   * the Item does not allow out-of-stock sales. Invoice enables this; Quote does
   * not. The Billing API still performs the authoritative check.
   */
  enforceItemStock?: boolean

  /**
   * Locks the rate cell for a catalogue line, because a price list prices it
   * server-side. The host sets `resolvedSubtotal` when that resolution lands.
   */
  priceListActive?: boolean

  /** Adds the percent/amount toggle to the discount cell. */
  allowPercentageDiscount?: boolean

  /**
   * Organization tax rates. Passing them turns the Tax column into a rate
   * picker whose amount is calculated; omitting them keeps a typed amount.
   */
  taxRates?: readonly DocumentTaxRateOption[]

  /**
   * Renders the running totals under the table. A host that places
   * `DocumentTotalsSummary` itself — beside notes, with editable adjustments —
   * turns this off.
   */
  showTotals?: boolean

  /** Heading in the table's header bar. */
  title?: string

  /** Labels the amount option of the discount toggle, e.g. `JMD`. */
  currency?: string

  /**
   * Runs the table edge to edge of the page, its first and last cells aligned
   * to the page gutter. For full-width document editors.
   */
  bleed?: boolean
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
 * Resolves a line's discount to minor units.
 *
 * The percentage arithmetic itself lives in `@876/core/money`, so the running
 * total a person reads cannot disagree with the document the service writes.
 * What stays here is reading the draft string a person is still typing.
 */
export function resolveLineDiscount(
  line: Pick<DocumentLineDraft, 'discountAmount' | 'discountType'>,
  subtotalAmount: bigint,
  minorUnitDigits: number
): bigint {
  const typed = line.discountAmount ?? ''

  if (line.discountType === 'PERCENTAGE') {
    const basisPoints = parseDecimalToMinorUnits(typed, PERCENT_DIGITS)
    if (basisPoints === null) return 0n
    // A half-typed or negative percentage reads as no discount, so a running
    // total stays on screen while a person types. A percentage over 100% is
    // deliberately left to resolve past the subtotal, so the document reports
    // it as invalid instead of quietly showing no discount.
    return resolvePercentageDiscount(subtotalAmount, basisPoints) ?? 0n
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

  const discountAmount = resolveLineDiscount(
    line,
    subtotalAmount,
    minorUnitDigits
  )

  return {
    subtotalAmount,
    taxAmount: line.taxRate
      ? calculateTax(subtotalAmount - discountAmount, line.taxRate)
      : (parseDecimalToMinorUnits(line.taxAmount ?? '', minorUnitDigits) ?? 0n),
    discountAmount,
  }
}

function resolveStockError(
  lines: readonly DocumentLineDraft[]
): DocumentTotalsSnapshot | null {
  const requested = new Map<
    string,
    { quantity: number; stock: number; label: string; lineIndex: number }
  >()

  for (const [lineIndex, line] of lines.entries()) {
    if (!line.itemId || !line.trackStock || line.allowOutOfStock) continue

    const quantity = Number(line.quantity)
    if (!Number.isInteger(quantity) || quantity <= 0) continue

    const stockKey = line.variantId ?? line.itemId
    const current = requested.get(stockKey)
    if (current) {
      current.quantity += quantity
      continue
    }

    requested.set(stockKey, {
      quantity,
      stock: line.stockQuantity ?? 0,
      label: line.description || 'This item',
      lineIndex,
    })
  }

  for (const value of requested.values()) {
    if (value.quantity > value.stock)
      return {
        status: 'invalid',
        message: `Only ${value.stock} units of ${value.label} are currently in stock.`,
        lineIndex: value.lineIndex,
      }
  }

  return null
}

/**
 * Catalogue entries as combobox options, led by the free-text escape hatch so
 * "this is not in the catalogue" is always one click away rather than being
 * something the user has to discover by typing.
 */
function toCatalogueOptions(
  entries: readonly DocumentItemOption[]
): AsyncComboboxOption[] {
  return [
    {
      value: '',
      label: 'One-off line',
      description: 'Bill something that is not in the catalogue',
      isAction: true,
    },
    ...entries.map((entry) => {
      const price =
        entry.defaultAmount && entry.currency
          ? `${entry.currency} ${entry.defaultAmount}`
          : null
      const stock = entry.trackStock
        ? `${entry.stockQuantity ?? 0} in stock`
        : null

      return {
        value: entry.value,
        label: entry.label,
        meta: [price, stock].filter(Boolean).join(' · ') || undefined,
        raw: entry,
      }
    }),
  ]
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
  onSearchItems,
  enforceItemStock = false,
  priceListActive = false,
  allowPercentageDiscount = false,
  taxRates,
  showTotals = true,
  title,
  currency,
  bleed = false,
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

  const stockError = useMemo(
    () => (enforceItemStock ? resolveStockError(lines) : null),
    [enforceItemStock, lines]
  )

  const snapshot = useMemo<DocumentTotalsSnapshot>(
    () =>
      stockError ??
      (result.error === null
        ? { status: 'ready', totals: result.data }
        : {
            status: 'invalid',
            message: result.error.message,
            lineIndex: result.error.lineIndex,
          }),
    [result, stockError]
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

  function selectItem(
    index: number,
    selectionId: string,
    resolvedOption?: DocumentItemOption | null
  ) {
    const option =
      resolvedOption ??
      items?.find((entry) => entry.value === selectionId) ??
      null

    update(index, {
      selectionId,
      itemId: option?.itemId ?? null,
      ...(option?.variants?.length ? { variantId: null } : {}),
      priceId: option?.priceId ?? null,
      trackStock: option?.trackStock ?? false,
      stockQuantity: option?.stockQuantity ?? null,
      allowOutOfStock: option?.allowOutOfStock ?? false,
      // The previous resolution belonged to the previous price. Clearing it
      // lets the host re-resolve rather than showing a stale subtotal.
      resolvedSubtotal: null,
      description: option?.label ?? lines[index]?.description ?? '',
      unitAmount: option?.defaultAmount ?? lines[index]?.unitAmount ?? '',
    })
  }

  function selectVariant(index: number, variantId: string) {
    const item = items?.find(
      (entry) => entry.value === lines[index]?.selectionId
    )
    const variant = item?.variants?.find((entry) => entry.id === variantId)
    update(index, {
      variantId: variantId || null,
      trackStock: variant?.trackStock ?? item?.trackStock ?? false,
      stockQuantity: variant?.stockQuantity ?? item?.stockQuantity ?? null,
      allowOutOfStock:
        variant?.allowOutOfStock ?? item?.allowOutOfStock ?? false,
      description: variant
        ? `${item?.label ?? ''} · ${variant.label}`
        : (lines[index]?.description ?? ''),
      unitAmount:
        variant?.defaultAmount ??
        item?.defaultAmount ??
        lines[index]?.unitAmount ??
        '',
      resolvedSubtotal: null,
    })
  }

  const invalidLine =
    snapshot.status === 'invalid' ? snapshot.lineIndex : undefined
  const cell = 'border-border border-l px-2 py-2 align-top'
  const quietControl =
    'hover:border-border focus-visible:border-ring h-9 border-transparent bg-transparent shadow-none dark:bg-transparent'
  const quietSelect =
    '[&_select]:hover:border-border [&_select]:border-transparent [&_select]:bg-transparent [&_select]:shadow-none'
  const gutterStart = bleed ? 'pl-[var(--876-shell-gutter)]' : 'pl-3'
  const gutterEnd = bleed ? 'pr-[var(--876-shell-gutter)]' : 'pr-2'
  const headCell = 'border-border border-l px-3 py-2.5 font-semibold'

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'border-border overflow-hidden',
          bleed ? '-mx-[var(--876-shell-gutter)] border-y' : 'rounded-lg border'
        )}
      >
        {title ? (
          <div
            className={cn(
              'border-border border-b py-3.5',
              bleed ? 'px-[var(--876-shell-gutter)]' : 'px-4'
            )}
          >
            <h2 className="text-sm font-semibold">{title}</h2>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="text-muted-foreground border-border border-b text-left text-[11px] font-semibold tracking-wide uppercase">
                <th
                  className={cn(
                    'w-12 py-2.5 pr-2 text-left font-semibold',
                    gutterStart
                  )}
                >
                  #
                </th>
                <th className={headCell}>Item details</th>
                <th className={cn(headCell, 'w-24 text-right')}>Qty</th>
                <th className={cn(headCell, 'w-36 text-right')}>Rate</th>
                <th
                  className={cn(
                    headCell,
                    'text-right',
                    allowPercentageDiscount ? 'w-44' : 'w-32'
                  )}
                >
                  Discount
                </th>
                <th
                  className={cn(
                    headCell,
                    taxRates ? 'w-48 text-left' : 'w-32 text-right'
                  )}
                >
                  Tax
                </th>
                {extraColumns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      headCell,
                      column.align === 'right' && 'text-right'
                    )}
                  >
                    {column.header}
                  </th>
                ))}
                <th className={cn(headCell, 'w-36 text-right')}>Amount</th>
                {readOnly ? null : <th className={cn('w-12', gutterEnd)} />}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const selectedItem = items?.find(
                  (entry) => entry.value === line.selectionId
                )

                return (
                  <tr
                    key={line.id}
                    aria-invalid={invalidLine === index || undefined}
                    className={cn(
                      'border-border border-b last:border-0',
                      invalidLine === index && 'bg-destructive/5'
                    )}
                  >
                    <td
                      className={cn(
                        'text-muted-foreground py-4 pr-2 align-top text-xs tabular-nums',
                        gutterStart
                      )}
                    >
                      {index + 1}
                    </td>
                    <td className={cn(cell, 'space-y-1')}>
                      {items ? (
                        onSearchItems ? (
                          <AsyncCombobox
                            id={`line-${line.id}-item`}
                            ariaLabel={`Line ${index + 1} item`}
                            value={line.selectionId ?? ''}
                            selectedLabel={
                              selectedItem?.label ?? line.description ?? ''
                            }
                            disabled={readOnly}
                            placeholder="Type or click to select an item"
                            className={quietControl}
                            minChars={0}
                            initialOptions={toCatalogueOptions(items)}
                            onSearch={async (query, signal) =>
                              toCatalogueOptions(
                                await onSearchItems(query, signal)
                              )
                            }
                            emptyMessage="No catalogue matches. Keep typing to bill it as a one-off."
                            onValueChange={(value, option) =>
                              selectItem(
                                index,
                                value,
                                (option?.raw as
                                  DocumentItemOption | undefined) ?? null
                              )
                            }
                          />
                        ) : (
                          <SearchableSelect
                            id={`line-${line.id}-item`}
                            ariaLabel={`Line ${index + 1} item`}
                            value={line.selectionId ?? ''}
                            disabled={readOnly}
                            placeholder="One-off line"
                            searchPlaceholder="Search catalogue…"
                            options={[
                              { value: '', label: 'One-off line' },
                              ...items,
                            ]}
                            onValueChange={(value) => selectItem(index, value)}
                          />
                        )
                      ) : null}
                      {selectedItem?.variants?.length ? (
                        <NativeSelect
                          aria-label={`Line ${index + 1} variant`}
                          className={cn('w-full', quietSelect)}
                          value={line.variantId ?? ''}
                          disabled={readOnly}
                          onChange={(event) =>
                            selectVariant(index, event.target.value)
                          }
                        >
                          <NativeSelectOption value="">
                            Choose variant
                          </NativeSelectOption>
                          {selectedItem.variants.map((variant) => (
                            <NativeSelectOption
                              key={variant.id}
                              value={variant.id}
                            >
                              {variant.label}
                              {variant.sku ? ` · ${variant.sku}` : ''}
                              {variant.trackStock
                                ? ` · ${variant.stockQuantity ?? 0} in stock`
                                : ''}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      ) : null}
                      <Input
                        aria-label={`Line ${index + 1} description`}
                        placeholder={
                          items ? 'Add a description' : 'Item or service'
                        }
                        className={cn(
                          quietControl,
                          items && 'text-muted-foreground h-8 text-xs'
                        )}
                        value={line.description}
                        disabled={readOnly}
                        onChange={(event) =>
                          update(index, { description: event.target.value })
                        }
                      />
                    </td>
                    <td className={cell}>
                      <Input
                        aria-label={`Line ${index + 1} quantity`}
                        inputMode="numeric"
                        className={cn(quietControl, 'text-right tabular-nums')}
                        value={line.quantity}
                        disabled={readOnly}
                        onChange={(event) =>
                          update(index, { quantity: event.target.value })
                        }
                      />
                    </td>
                    <td className={cell}>
                      <Input
                        aria-label={`Line ${index + 1} rate`}
                        inputMode="decimal"
                        placeholder="0.00"
                        className={cn(quietControl, 'text-right tabular-nums')}
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
                    <td className={cell}>
                      <div className="flex items-center gap-1">
                        <Input
                          aria-label={`Line ${index + 1} discount`}
                          inputMode="decimal"
                          placeholder="0"
                          className={cn(
                            quietControl,
                            'text-right tabular-nums'
                          )}
                          value={line.discountAmount ?? ''}
                          disabled={readOnly}
                          onChange={(event) =>
                            update(index, {
                              discountAmount: event.target.value,
                            })
                          }
                        />
                        {allowPercentageDiscount ? (
                          <NativeSelect
                            aria-label={`Line ${index + 1} discount type`}
                            className={cn('w-[4.5rem] shrink-0', quietSelect)}
                            value={line.discountType ?? 'AMOUNT'}
                            disabled={readOnly}
                            onChange={(event) =>
                              update(index, {
                                discountType: event.target
                                  .value as DocumentLineDiscountType,
                              })
                            }
                          >
                            <NativeSelectOption value="PERCENTAGE">
                              %
                            </NativeSelectOption>
                            <NativeSelectOption value="AMOUNT">
                              {currency ?? 'Amt'}
                            </NativeSelectOption>
                          </NativeSelect>
                        ) : null}
                      </div>
                    </td>
                    <td className={cell}>
                      {taxRates ? (
                        <NativeSelect
                          aria-label={`Line ${index + 1} tax`}
                          className={cn('w-full', quietSelect)}
                          value={line.taxRateId ?? ''}
                          disabled={readOnly}
                          onChange={(event) => {
                            const rate = taxRates.find(
                              (option) => option.id === event.target.value
                            )
                            update(index, {
                              taxRateId: rate?.id ?? null,
                              taxRate: rate?.rate ?? null,
                              taxAmount: '0',
                            })
                          }}
                        >
                          <NativeSelectOption value="">
                            Select a tax
                          </NativeSelectOption>
                          {taxRates.map((rate) => (
                            <NativeSelectOption key={rate.id} value={rate.id}>
                              {rate.label}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      ) : (
                        <Input
                          aria-label={`Line ${index + 1} tax`}
                          inputMode="decimal"
                          placeholder="0.00"
                          className={cn(
                            quietControl,
                            'text-right tabular-nums'
                          )}
                          value={line.taxAmount ?? ''}
                          disabled={readOnly}
                          onChange={(event) =>
                            update(index, { taxAmount: event.target.value })
                          }
                        />
                      )}
                    </td>
                    {extraColumns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          cell,
                          column.align === 'right' && 'text-right'
                        )}
                      >
                        {column.render(line, index)}
                      </td>
                    ))}
                    <td
                      className={cn(
                        cell,
                        'px-3 py-4 text-right font-semibold tabular-nums'
                      )}
                      data-testid={`line-total-${index}`}
                    >
                      {formatAmount(
                        snapshot.status === 'ready'
                          ? (snapshot.totals.lines[index]?.totalAmount ?? 0n)
                          : 0n
                      )}
                    </td>
                    {readOnly ? null : (
                      <td className={cn('py-2 align-top', gutterEnd)}>
                        <div className="flex items-center justify-end gap-1 pt-0.5">
                          {renderRowActions?.(line, index)}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            aria-label={`Remove line ${index + 1}`}
                            onClick={() =>
                              onChange(
                                lines.filter(
                                  (_, position) => position !== index
                                )
                              )
                            }
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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

      {snapshot.status === 'invalid' ? (
        <p role="alert" className="text-destructive text-sm">
          {snapshot.message}
        </p>
      ) : null}

      {showTotals ? (
        <DocumentTotalsSummary
          snapshot={snapshot}
          formatAmount={formatAmount}
          className="ml-auto max-w-sm"
        />
      ) : null}

      {footer}
    </div>
  )
}

export { formatMinorUnits }
