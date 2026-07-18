'use client'

import { useEffect, useMemo } from 'react'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Plus, Trash } from '@876/ui/icons'

import {
  calculateDocumentLineTotal,
  calculateDocumentTotals,
  emptyDocumentLine,
  type DocumentItemOption,
  type EditableDocumentLine,
} from '@/components/document-create-model'
import { formatMinorAmountInput, minorAmountInputStep } from '@/lib/format'
import { client } from '@/lib/client'

export function DocumentLineEditor({
  kind,
  lines,
  items,
  currency,
  priceListId,
  decimalPlaces,
  onChange,
}: {
  kind: 'invoice' | 'quote'
  lines: EditableDocumentLine[]
  items: DocumentItemOption[]
  currency: string
  priceListId: string
  decimalPlaces: number
  onChange: (lines: EditableDocumentLine[]) => void
}) {
  const totals = useMemo(() => calculateDocumentTotals(lines), [lines])
  const money = useMemo(
    () => new Intl.NumberFormat('en-JM', { style: 'currency', currency }),
    [currency]
  )

  useEffect(() => {
    let cancelled = false
    if (!priceListId) {
      if (lines.some((line) => line.resolvedSubtotal !== null))
        onChange(lines.map((line) => ({ ...line, resolvedSubtotal: null })))
      return () => {
        cancelled = true
      }
    }

    const targets = lines.filter(
      (line) =>
        line.priceId &&
        Number.isInteger(Number(line.quantity)) &&
        Number(line.quantity) > 0
    )
    if (targets.length === 0)
      return () => {
        cancelled = true
      }

    void Promise.all(
      targets.map(async (line) => ({
        key: line.key,
        result: await client.priceLists.resolve(
          priceListId,
          line.priceId,
          Number(line.quantity)
        ),
      }))
    ).then((resolved) => {
      if (cancelled) return
      const amounts = new Map(
        resolved.flatMap(({ key, result }) =>
          result.data && result.data.currency === currency
            ? [
                [
                  key,
                  formatMinorAmountInput(result.data.amount, decimalPlaces),
                ] as const,
              ]
            : []
        )
      )
      if (
        !lines.some(
          (line) =>
            amounts.has(line.key) &&
            amounts.get(line.key) !== line.resolvedSubtotal
        )
      )
        return
      onChange(
        lines.map((line) => ({
          ...line,
          resolvedSubtotal: amounts.get(line.key) ?? null,
        }))
      )
    })

    return () => {
      cancelled = true
    }
  }, [currency, decimalPlaces, lines, onChange, priceListId])

  function updateLine(key: string, patch: Partial<EditableDocumentLine>) {
    onChange(
      lines.map((line) => (line.key === key ? { ...line, ...patch } : line))
    )
  }

  function selectItem(line: EditableDocumentLine, selectionId: string) {
    const item = items.find((option) => option.value === selectionId)
    updateLine(line.key, {
      selectionId,
      itemId: item?.itemId ?? '',
      priceId: item?.priceId ?? '',
      resolvedSubtotal: null,
      description: item?.label ?? line.description,
      unitAmount:
        item?.defaultAmount && item.currency === currency
          ? formatMinorAmountInput(item.defaultAmount, decimalPlaces)
          : line.unitAmount,
    })
  }

  function removeLine(key: string) {
    onChange(
      lines.length === 1
        ? [emptyDocumentLine('line-1')]
        : lines.filter((line) => line.key !== key)
    )
  }

  return (
    <section className="876-card overflow-hidden">
      <div className="border-border border-b px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-balance">Line items</h2>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Add every product or service included in this {kind}.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr className="border-border border-b">
              <th className="px-4 py-3 text-left font-medium">Item</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="w-24 px-3 py-3 text-right font-medium">Qty</th>
              <th className="w-36 px-3 py-3 text-right font-medium">Rate</th>
              <th className="w-52 px-3 py-3 text-right font-medium">
                Discount
              </th>
              <th className="w-32 px-3 py-3 text-right font-medium">Tax</th>
              <th className="w-36 px-4 py-3 text-right font-medium">Amount</th>
              <th className="w-12 px-2 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr
                key={line.key}
                className="border-border border-b align-top last:border-b-0"
              >
                <td className="px-4 py-3">
                  <Label className="sr-only" htmlFor={`${line.key}-item`}>
                    Item for line {index + 1}
                  </Label>
                  <NativeSelect
                    id={`${line.key}-item`}
                    value={line.selectionId}
                    onChange={(event) => selectItem(line, event.target.value)}
                    className="w-48"
                  >
                    <NativeSelectOption value="">
                      Custom item
                    </NativeSelectOption>
                    {items.map((item) => (
                      <NativeSelectOption key={item.value} value={item.value}>
                        {item.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </td>
                <td className="px-4 py-3">
                  <Label
                    className="sr-only"
                    htmlFor={`${line.key}-description`}
                  >
                    Description for line {index + 1}
                  </Label>
                  <Input
                    id={`${line.key}-description`}
                    value={line.description}
                    onChange={(event) =>
                      updateLine(line.key, { description: event.target.value })
                    }
                    placeholder="Product or service description"
                  />
                </td>
                <AmountCell
                  id={`${line.key}-quantity`}
                  label={`Quantity for line ${index + 1}`}
                  value={line.quantity}
                  min="1"
                  step="1"
                  onChange={(quantity) => updateLine(line.key, { quantity })}
                />
                <AmountCell
                  id={`${line.key}-rate`}
                  label={`Rate for line ${index + 1}`}
                  value={line.unitAmount}
                  step={minorAmountInputStep(decimalPlaces)}
                  onChange={(unitAmount) =>
                    updateLine(line.key, {
                      unitAmount,
                      resolvedSubtotal: null,
                    })
                  }
                  disabled={Boolean(priceListId && line.priceId)}
                />
                <DiscountCell
                  id={`${line.key}-discount`}
                  lineNumber={index + 1}
                  type={line.discountType}
                  value={line.discountValue}
                  decimalPlaces={decimalPlaces}
                  onTypeChange={(discountType) =>
                    updateLine(line.key, { discountType })
                  }
                  onValueChange={(discountValue) =>
                    updateLine(line.key, { discountValue })
                  }
                />
                <AmountCell
                  id={`${line.key}-tax`}
                  label={`Tax for line ${index + 1}`}
                  value={line.taxAmount}
                  step={minorAmountInputStep(decimalPlaces)}
                  onChange={(taxAmount) => updateLine(line.key, { taxAmount })}
                />
                <td className="px-4 py-5 text-right font-medium tabular-nums">
                  {money.format(calculateDocumentLineTotal(line))}
                </td>
                <td className="px-2 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove line ${index + 1}`}
                    onClick={() => removeLine(line.key)}
                  >
                    <Trash className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-6 border-t p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onChange([...lines, emptyDocumentLine(crypto.randomUUID())])
          }
        >
          <Plus className="size-4" />
          Add line item
        </Button>
        <dl className="w-full max-w-sm space-y-3 text-sm">
          <TotalRow label="Subtotal" value={money.format(totals.subtotal)} />
          <TotalRow
            label="Discount"
            value={`−${money.format(totals.discount)}`}
          />
          <TotalRow label="Tax" value={money.format(totals.tax)} />
          <div className="border-border flex items-center justify-between border-t pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{money.format(totals.total)}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

function AmountCell({
  id,
  label,
  value,
  min = '0',
  step,
  onChange,
  disabled = false,
}: {
  id: string
  label: string
  value: string
  min?: string
  step: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <td className="px-3 py-3">
      <Label className="sr-only" htmlFor={id}>
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="text-right tabular-nums"
      />
    </td>
  )
}

function DiscountCell({
  id,
  lineNumber,
  type,
  value,
  decimalPlaces,
  onTypeChange,
  onValueChange,
}: {
  id: string
  lineNumber: number
  type: EditableDocumentLine['discountType']
  value: string
  decimalPlaces: number
  onTypeChange: (value: EditableDocumentLine['discountType']) => void
  onValueChange: (value: string) => void
}) {
  return (
    <td className="px-3 py-3">
      <div className="grid grid-cols-[5.5rem_1fr] gap-2">
        <Label className="sr-only" htmlFor={`${id}-type`}>
          Discount type for line {lineNumber}
        </Label>
        <NativeSelect
          id={`${id}-type`}
          value={type}
          onChange={(event) =>
            onTypeChange(
              event.target.value as EditableDocumentLine['discountType']
            )
          }
        >
          <NativeSelectOption value="AMOUNT">Amount</NativeSelectOption>
          <NativeSelectOption value="PERCENTAGE">Percent</NativeSelectOption>
        </NativeSelect>
        <Label className="sr-only" htmlFor={id}>
          Discount value for line {lineNumber}
        </Label>
        <Input
          id={id}
          type="number"
          min="0"
          max={type === 'PERCENTAGE' ? '100' : undefined}
          step={
            type === 'PERCENTAGE' ? '0.01' : minorAmountInputStep(decimalPlaces)
          }
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className="text-right tabular-nums"
        />
      </div>
    </td>
  )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-muted-foreground flex items-center justify-between gap-8">
      <dt>{label}</dt>
      <dd className="text-foreground tabular-nums">{value}</dd>
    </div>
  )
}
