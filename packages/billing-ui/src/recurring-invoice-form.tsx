'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { RecurringInvoiceCreateParams } from '@876/billing'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { RadioGroup, RadioGroupItem } from '@876/ui/radio-group'
import { Textarea } from '@876/ui/textarea'

import {
  DocumentLineItemsEditor,
  type DocumentItemOption,
  type DocumentLineDraft,
  type DocumentTotalsSnapshot,
} from './document/document-line-items-editor'
import { prepareDocumentLine } from './document/document-line-payload'
import {
  formatMinorAmountInput,
  unixTimestampToDateInput,
} from './money-input'

export interface RecurringInvoiceFormOption {
  value: string
  label: string
}

export interface RecurringInvoiceFormCurrencyOption
  extends RecurringInvoiceFormOption {
  decimalPlaces: number
}

export interface RecurringInvoiceFormVariantOption {
  id: string
  label: string
  sku: string | null
  defaultAmount: string | null
  currency: string | null
  trackStock?: boolean
  stockQuantity?: number | null
  allowOutOfStock?: boolean
}

export interface RecurringInvoiceFormItemOption {
  value: string
  label: string
  itemId: string
  priceId?: string | null
  defaultAmount: string | null
  currency: string | null
  trackStock?: boolean
  stockQuantity?: number | null
  allowOutOfStock?: boolean
  variants?: readonly RecurringInvoiceFormVariantOption[]
}

export interface RecurringInvoiceFormActionResult {
  id: string | null
  error: string | null
}

export type RecurringInvoiceEndMode = 'never' | 'on-date' | 'after-cycles'

export type RecurringInvoiceGenerationMode =
  RecurringInvoiceCreateParams['generationMode']

export interface RecurringInvoiceFormInitialLine {
  itemId?: string | null
  variantId?: string | null
  priceId?: string | null
  description?: string | null
  quantity?: number
  unitAmount?: string | null
  taxAmount?: string
  discountAmount?: string
}

export interface RecurringInvoiceFormInitial {
  profileName: string
  customerId: string
  currency: string
  intervalUnit: string
  intervalCount: number
  startAt: number
  endAt: number | null
  maxCycles: number | null
  generationMode: RecurringInvoiceGenerationMode
  paymentTermId: string | null
  notes: string | null
  terms: string | null
  lines: RecurringInvoiceFormInitialLine[]
}

export interface RecurringInvoiceFormProps {
  mode: 'create' | 'edit'
  initial?: RecurringInvoiceFormInitial
  customers: RecurringInvoiceFormOption[]
  paymentTerms?: RecurringInvoiceFormOption[]
  currencies: RecurringInvoiceFormCurrencyOption[]
  items: RecurringInvoiceFormItemOption[]
  defaultCurrency: string
  returnUrl?: string
  onSubmit: (
    params: RecurringInvoiceCreateParams
  ) => Promise<RecurringInvoiceFormActionResult>
}

export const RECURRING_INTERVAL_UNITS = ['day', 'week', 'month', 'year'] as const

function emptyLine(id: string): DocumentLineDraft {
  return {
    id,
    description: '',
    quantity: '1',
    unitAmount: '',
    taxAmount: '0',
    discountAmount: '0',
    discountType: 'AMOUNT',
  }
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function initialLines(
  initial: RecurringInvoiceFormInitial | undefined,
  decimalPlaces: number
): DocumentLineDraft[] {
  if (!initial || initial.lines.length === 0)
    return [emptyLine('recurring-invoice-line-1')]
  return initial.lines.map((line, index) => ({
    id: `recurring-invoice-line-${index + 1}`,
    itemId: line.itemId ?? null,
    variantId: line.variantId ?? null,
    priceId: line.priceId ?? null,
    description: line.description ?? '',
    quantity: String(line.quantity ?? 1),
    unitAmount:
      line.unitAmount !== null && line.unitAmount !== undefined
        ? formatMinorAmountInput(line.unitAmount, decimalPlaces)
        : '',
    taxAmount: line.taxAmount
      ? formatMinorAmountInput(line.taxAmount, decimalPlaces)
      : '0',
    discountAmount: line.discountAmount
      ? formatMinorAmountInput(line.discountAmount, decimalPlaces)
      : '0',
    discountType: 'AMOUNT' as const,
  }))
}

/** Shared recurring-invoice profile creator/editor used by Billing and Invoice hosts. */
export function RecurringInvoiceForm({
  mode,
  initial,
  customers,
  paymentTerms,
  currencies,
  items,
  defaultCurrency,
  returnUrl = '/recurring-invoices',
  onSubmit,
}: RecurringInvoiceFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [profileName, setProfileName] = useState(initial?.profileName ?? '')
  const [customerId, setCustomerId] = useState(initial?.customerId ?? '')
  const [currency, setCurrency] = useState(
    initial?.currency ?? defaultCurrency
  )
  const [intervalUnit, setIntervalUnit] = useState(
    initial?.intervalUnit ?? 'month'
  )
  const [intervalCount, setIntervalCount] = useState(
    String(initial?.intervalCount ?? 1)
  )
  const [startDate, setStartDate] = useState(
    initial ? unixTimestampToDateInput(initial.startAt) : todayInputValue
  )
  const [endMode, setEndMode] = useState<RecurringInvoiceEndMode>(
    initial?.endAt != null
      ? 'on-date'
      : initial?.maxCycles != null
        ? 'after-cycles'
        : 'never'
  )
  const [endDate, setEndDate] = useState(
    initial?.endAt != null ? unixTimestampToDateInput(initial.endAt) : ''
  )
  const [maxCycles, setMaxCycles] = useState(
    initial?.maxCycles != null ? String(initial.maxCycles) : ''
  )
  const [generationMode, setGenerationMode] =
    useState<RecurringInvoiceGenerationMode>(
      initial?.generationMode ?? 'draft'
    )
  const [paymentTermId, setPaymentTermId] = useState(
    initial?.paymentTermId ?? ''
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [terms, setTerms] = useState(initial?.terms ?? '')
  const decimalPlaces = currencyDecimals(
    currencies,
    initial?.currency ?? currency
  )
  const [lines, setLines] = useState<DocumentLineDraft[]>(() =>
    initialLines(initial, decimalPlaces)
  )
  const [totals, setTotals] = useState<DocumentTotalsSnapshot | null>(null)

  const currencyDigits = currencyDecimals(currencies, currency)
  const editorItems = useMemo<DocumentItemOption[]>(
    () =>
      items.map((item) => ({
        value: item.value,
        label: item.label,
        itemId: item.itemId,
        priceId: item.priceId ?? null,
        defaultAmount:
          item.defaultAmount !== null && item.currency === currency
            ? formatMinorAmountInput(item.defaultAmount, currencyDigits)
            : null,
        currency: item.currency,
        trackStock: item.trackStock,
        stockQuantity: item.stockQuantity,
        allowOutOfStock: item.allowOutOfStock,
        variants: item.variants?.map((variant) => ({
          id: variant.id,
          label: variant.label,
          sku: variant.sku,
          defaultAmount:
            variant.defaultAmount !== null && variant.currency === currency
              ? formatMinorAmountInput(variant.defaultAmount, currencyDigits)
              : null,
          trackStock: variant.trackStock,
          stockQuantity: variant.stockQuantity,
          allowOutOfStock: variant.allowOutOfStock,
        })),
      })),
    [currency, currencyDigits, items]
  )

  function changeCurrency(value: string) {
    setCurrency(value)
    setLines((current) =>
      current.map((line) => ({
        ...line,
        selectionId: '',
        itemId: null,
        variantId: null,
        priceId: null,
        unitAmount: '',
      }))
    )
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!profileName.trim()) {
      setError('Enter a profile name.')
      return
    }
    if (!customerId) {
      setError('Select a customer.')
      return
    }
    const count = Number(intervalCount)
    if (
      !RECURRING_INTERVAL_UNITS.includes(
        intervalUnit as (typeof RECURRING_INTERVAL_UNITS)[number]
      ) ||
      !Number.isInteger(count) ||
      count < 1
    ) {
      setError('Enter a valid frequency of at least every 1 interval.')
      return
    }
    const startAt = Date.parse(`${startDate}T00:00:00.000Z`)
    if (Number.isNaN(startAt)) {
      setError('Enter a valid start date.')
      return
    }
    let endAt: number | null = null
    if (endMode === 'on-date') {
      if (!endDate) {
        setError('Enter an end date or choose a different end option.')
        return
      }
      const parsed = Date.parse(`${endDate}T00:00:00.000Z`)
      if (Number.isNaN(parsed)) {
        setError('Enter a valid end date.')
        return
      }
      if (parsed < startAt) {
        setError('The end date must be on or after the start date.')
        return
      }
      endAt = Math.floor(parsed / 1000)
    }
    let cycles: number | null = null
    if (endMode === 'after-cycles') {
      const parsed = Number(maxCycles)
      if (!Number.isInteger(parsed) || parsed < 1) {
        setError('Enter the number of invoices to generate (at least 1).')
        return
      }
      cycles = parsed
    }
    if (totals?.status !== 'ready') {
      setError(
        totals?.status === 'invalid'
          ? totals.message
          : 'Line item totals are still being calculated.'
      )
      return
    }

    const preparedLines = lines.map((line) =>
      prepareDocumentLine(line, currencyDigits)
    )
    if (preparedLines.some((line) => line === null)) {
      setError(
        'Every line needs an item or description, a positive quantity, and valid amounts.'
      )
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await onSubmit({
        profileName: profileName.trim(),
        customerId,
        currency,
        frequency: {
          intervalUnit: intervalUnit as 'day' | 'week' | 'month' | 'year',
          intervalCount: count,
        },
        startAt: Math.floor(startAt / 1000),
        endAt,
        maxCycles: cycles,
        generationMode,
        paymentTermId: paymentTermId || null,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        lines: preparedLines.filter((line) => line !== null),
      })

      if (result.error || !result.id) {
        setError(result.error ?? 'Failed to save the recurring invoice.')
        return
      }

      router.push(`${returnUrl}/${result.id}`)
      router.refresh()
    })
  }

  const submitLabel =
    mode === 'create' ? 'Create recurring invoice' : 'Save changes'
  const pendingLabel = mode === 'create' ? 'Creating...' : 'Saving...'

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="876-card grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Profile name" htmlFor="recurring-invoice-name">
          <Input
            id="recurring-invoice-name"
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
          />
        </Field>

        <Field label="Customer" htmlFor="recurring-invoice-customer">
          <NativeSelect
            id="recurring-invoice-customer"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
          >
            <NativeSelectOption value="">Select...</NativeSelectOption>
            {customers.map((customer) => (
              <NativeSelectOption key={customer.value} value={customer.value}>
                {customer.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field label="Currency" htmlFor="recurring-invoice-currency">
          <NativeSelect
            id="recurring-invoice-currency"
            value={currency}
            onChange={(event) => changeCurrency(event.target.value)}
          >
            {currencies.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        {paymentTerms ? (
          <Field label="Payment term" htmlFor="recurring-invoice-term">
            <NativeSelect
              id="recurring-invoice-term"
              value={paymentTermId}
              onChange={(event) => setPaymentTermId(event.target.value)}
            >
              <NativeSelectOption value="">None</NativeSelectOption>
              {paymentTerms.map((term) => (
                <NativeSelectOption key={term.value} value={term.value}>
                  {term.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
      </section>

      <section className="876-card grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Repeats every" htmlFor="recurring-invoice-interval">
          <div className="flex gap-2">
            <Input
              id="recurring-invoice-interval"
              type="number"
              value={intervalCount}
              onChange={(event) => setIntervalCount(event.target.value)}
              className="w-24"
            />
            <NativeSelect
              aria-label="Frequency unit"
              value={intervalUnit}
              onChange={(event) => setIntervalUnit(event.target.value)}
            >
              {RECURRING_INTERVAL_UNITS.map((unit) => (
                <NativeSelectOption key={unit} value={unit}>
                  {unit === 'day'
                    ? 'Day(s)'
                    : unit === 'week'
                      ? 'Week(s)'
                      : unit === 'month'
                        ? 'Month(s)'
                        : 'Year(s)'}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </Field>

        <Field label="Start date" htmlFor="recurring-invoice-start">
          <Input
            id="recurring-invoice-start"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </Field>

        <div className="space-y-2 sm:col-span-2">
          <Label id="recurring-invoice-end-label">Ends</Label>
          <RadioGroup
            aria-labelledby="recurring-invoice-end-label"
            value={endMode}
            onValueChange={(value) =>
              setEndMode(value as RecurringInvoiceEndMode)
            }
            className="gap-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="never" id="recurring-invoice-end-never" />
              <Label htmlFor="recurring-invoice-end-never" className="mb-0">
                Never
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem
                value="on-date"
                id="recurring-invoice-end-date"
              />
              <Label htmlFor="recurring-invoice-end-date" className="mb-0">
                On date
              </Label>
              <Input
                aria-label="End date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                disabled={endMode !== 'on-date'}
                className="max-w-44"
              />
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem
                value="after-cycles"
                id="recurring-invoice-end-cycles"
              />
              <Label htmlFor="recurring-invoice-end-cycles" className="mb-0">
                After
              </Label>
              <Input
                aria-label="Number of invoices"
                type="number"
                min="1"
                step="1"
                value={maxCycles}
                onChange={(event) => setMaxCycles(event.target.value)}
                disabled={endMode !== 'after-cycles'}
                className="w-24"
              />
              <span className="text-muted-foreground text-sm">invoices</span>
            </div>
          </RadioGroup>
        </div>
      </section>

      <section className="876-card grid gap-5 p-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label id="recurring-invoice-mode-label">Generated invoices</Label>
          <RadioGroup
            aria-labelledby="recurring-invoice-mode-label"
            value={generationMode}
            onValueChange={(value) =>
              setGenerationMode(value as RecurringInvoiceGenerationMode)
            }
            className="gap-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="draft" id="recurring-invoice-mode-draft" />
              <Label htmlFor="recurring-invoice-mode-draft" className="mb-0">
                Save as draft
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem
                value="finalize"
                id="recurring-invoice-mode-finalize"
              />
              <Label htmlFor="recurring-invoice-mode-finalize" className="mb-0">
                Finalize
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem
                value="finalize-and-send"
                id="recurring-invoice-mode-send"
              />
              <Label htmlFor="recurring-invoice-mode-send" className="mb-0">
                Finalize and send
              </Label>
            </div>
          </RadioGroup>
        </div>
      </section>

      <section className="876-card overflow-hidden">
        <div className="border-border border-b px-5 py-4">
          <h2 className="font-semibold">Template lines</h2>
        </div>
        <div className="p-5">
          <DocumentLineItemsEditor
            lines={lines}
            onChange={setLines}
            items={editorItems}
            minorUnitDigits={currencyDigits}
            formatAmount={(amount) =>
              `${currency} ${formatMinorAmountInput(amount, currencyDigits)}`
            }
            allowPercentageDiscount
            enforceItemStock
            onTotalsChange={setTotals}
          />
        </div>
      </section>

      <section className="876-card grid gap-5 p-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="recurring-invoice-notes">Notes</Label>
          <Textarea
            id="recurring-invoice-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="recurring-invoice-terms">Terms</Label>
          <Textarea
            id="recurring-invoice-terms"
            value={terms}
            onChange={(event) => setTerms(event.target.value)}
            rows={3}
          />
        </div>
      </section>

      {error ? (
        <AppError error={{ code: 'recurring-invoice/save-failed', message: error }} variant="form" />
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(returnUrl)}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

function currencyDecimals(
  currencies: readonly RecurringInvoiceFormCurrencyOption[],
  currency: string
) {
  return (
    currencies.find((option) => option.value === currency)?.decimalPlaces ?? 2
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}
