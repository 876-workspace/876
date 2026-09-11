'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SalesReceiptCreateParams } from '@876/billing'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
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
  minorAmountInputStep,
  parseMinorAmountInput,
  zeroMinorAmountInput,
} from './money-input'

export interface SalesReceiptCreateOption {
  value: string
  label: string
}

export interface SalesReceiptCreateAccountOption extends SalesReceiptCreateOption {
  currency: string
}

export interface SalesReceiptCreateCurrencyOption extends SalesReceiptCreateOption {
  decimalPlaces: number
}

export interface SalesReceiptCreateVariantOption {
  id: string
  label: string
  sku: string | null
  defaultAmount: string | null
  currency: string | null
  trackStock?: boolean
  stockQuantity?: number | null
  allowOutOfStock?: boolean
}

export interface SalesReceiptCreateItemOption {
  value: string
  label: string
  itemId: string
  priceId?: string | null
  defaultAmount: string | null
  currency: string | null
  trackStock?: boolean
  stockQuantity?: number | null
  allowOutOfStock?: boolean
  variants?: readonly SalesReceiptCreateVariantOption[]
}

export interface SalesReceiptCreateActionResult {
  id: string | null
  error: string | null
}

export interface SalesReceiptCreateFormProps {
  customers: SalesReceiptCreateOption[]
  accounts: SalesReceiptCreateAccountOption[]
  modes: SalesReceiptCreateOption[]
  currencies: SalesReceiptCreateCurrencyOption[]
  items: SalesReceiptCreateItemOption[]
  defaultCurrency: string
  returnUrl?: string
  onCreate: (
    params: SalesReceiptCreateParams
  ) => Promise<SalesReceiptCreateActionResult>
}

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

/** Shared immediate-sale creator used by Billing and Invoice hosts. */
export function SalesReceiptCreateForm({
  customers,
  accounts,
  modes,
  currencies,
  items,
  defaultCurrency,
  returnUrl = '/sales-receipts',
  onCreate,
}: SalesReceiptCreateFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [currency, setCurrency] = useState(defaultCurrency)
  const [receiptDate, setReceiptDate] = useState(todayInputValue)
  const [modeId, setModeId] = useState(modes[0]?.value ?? '')
  const [accountId, setAccountId] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [paymentReferenceNumber, setPaymentReferenceNumber] = useState('')
  const [bankCharges, setBankCharges] = useState(() =>
    zeroMinorAmountInput(currencyDecimals(currencies, defaultCurrency))
  )
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [lines, setLines] = useState<DocumentLineDraft[]>([
    emptyLine('sales-receipt-line-1'),
  ])
  const [totals, setTotals] = useState<DocumentTotalsSnapshot | null>(null)

  const decimalPlaces = currencyDecimals(currencies, currency)
  const availableAccounts = accounts.filter(
    (account) => account.currency === currency
  )
  const editorItems = useMemo<DocumentItemOption[]>(
    () =>
      items.map((item) => ({
        value: item.value,
        label: item.label,
        itemId: item.itemId,
        priceId: item.priceId ?? null,
        defaultAmount:
          item.defaultAmount !== null && item.currency === currency
            ? formatMinorAmountInput(item.defaultAmount, decimalPlaces)
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
              ? formatMinorAmountInput(variant.defaultAmount, decimalPlaces)
              : null,
          trackStock: variant.trackStock,
          stockQuantity: variant.stockQuantity,
          allowOutOfStock: variant.allowOutOfStock,
        })),
      })),
    [currency, decimalPlaces, items]
  )

  function changeCurrency(value: string) {
    setCurrency(value)
    setAccountId('')
    setBankCharges(zeroMinorAmountInput(currencyDecimals(currencies, value)))
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

    if (!customerId || !modeId || !accountId) {
      setError('Select a customer, payment mode, and deposit account.')
      return
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
      prepareDocumentLine(line, decimalPlaces)
    )
    if (preparedLines.some((line) => line === null)) {
      setError(
        'Every line needs an item or description, a positive quantity, and valid amounts.'
      )
      return
    }

    const charges = parseMinorAmountInput(bankCharges, decimalPlaces, true)
    if (charges === null) {
      setError('Enter valid bank charges.')
      return
    }

    const receiptAt = Date.parse(`${receiptDate}T00:00:00.000Z`)
    if (Number.isNaN(receiptAt)) {
      setError('Enter a valid receipt date.')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await onCreate({
        customerId,
        currency,
        receiptAt: Math.floor(receiptAt / 1000),
        referenceNumber: referenceNumber.trim() || null,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        lines: preparedLines.filter((line) => line !== null),
        paymentModeId: modeId,
        depositAccountId: accountId,
        paymentDate: Math.floor(receiptAt / 1000),
        paymentReferenceNumber: paymentReferenceNumber.trim() || null,
        bankCharges: charges,
      })

      if (result.error || !result.id) {
        setError(result.error ?? 'Failed to create the sales receipt.')
        return
      }

      router.push(`${returnUrl}/${result.id}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="876-card grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Customer" htmlFor="sales-receipt-customer">
          <NativeSelect
            id="sales-receipt-customer"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            required
          >
            <NativeSelectOption value="">Select...</NativeSelectOption>
            {customers.map((customer) => (
              <NativeSelectOption key={customer.value} value={customer.value}>
                {customer.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field label="Currency" htmlFor="sales-receipt-currency">
          <NativeSelect
            id="sales-receipt-currency"
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

        <Field label="Receipt date" htmlFor="sales-receipt-date">
          <Input
            id="sales-receipt-date"
            type="date"
            value={receiptDate}
            onChange={(event) => setReceiptDate(event.target.value)}
            required
          />
        </Field>

        <Field label="Sale reference" htmlFor="sales-receipt-reference">
          <Input
            id="sales-receipt-reference"
            value={referenceNumber}
            onChange={(event) => setReferenceNumber(event.target.value)}
          />
        </Field>
      </section>

      <section className="876-card overflow-hidden">
        <div className="border-border border-b px-5 py-4">
          <h2 className="font-semibold">Items sold</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            The receipt is issued as paid when this sale is saved.
          </p>
        </div>
        <div className="p-5">
          <DocumentLineItemsEditor
            lines={lines}
            onChange={setLines}
            items={editorItems}
            minorUnitDigits={decimalPlaces}
            formatAmount={(amount) =>
              `${currency} ${formatMinorAmountInput(amount, decimalPlaces)}`
            }
            allowPercentageDiscount
            enforceItemStock
            onTotalsChange={setTotals}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="876-card grid gap-5 p-5 sm:grid-cols-2">
          <Field label="Payment mode" htmlFor="sales-receipt-payment-mode">
            <NativeSelect
              id="sales-receipt-payment-mode"
              value={modeId}
              onChange={(event) => setModeId(event.target.value)}
              required
            >
              <NativeSelectOption value="">Select...</NativeSelectOption>
              {modes.map((mode) => (
                <NativeSelectOption key={mode.value} value={mode.value}>
                  {mode.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Deposit to" htmlFor="sales-receipt-account">
            <NativeSelect
              id="sales-receipt-account"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              required
            >
              <NativeSelectOption value="">Select...</NativeSelectOption>
              {availableAccounts.map((account) => (
                <NativeSelectOption key={account.value} value={account.value}>
                  {account.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="Payment reference"
            htmlFor="sales-receipt-payment-reference"
          >
            <Input
              id="sales-receipt-payment-reference"
              value={paymentReferenceNumber}
              onChange={(event) =>
                setPaymentReferenceNumber(event.target.value)
              }
            />
          </Field>

          <Field label="Bank charges" htmlFor="sales-receipt-bank-charges">
            <Input
              id="sales-receipt-bank-charges"
              type="number"
              min="0"
              step={minorAmountInputStep(decimalPlaces)}
              value={bankCharges}
              onChange={(event) => setBankCharges(event.target.value)}
            />
          </Field>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sales-receipt-notes">Notes</Label>
            <Textarea
              id="sales-receipt-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sales-receipt-terms">Terms</Label>
            <Textarea
              id="sales-receipt-terms"
              value={terms}
              onChange={(event) => setTerms(event.target.value)}
              rows={3}
            />
          </div>
        </section>

        <aside className="876-card h-fit p-5">
          <p className="876-eyebrow">Immediate paid sale</p>
          <p className="mt-3 text-sm font-medium">
            {totals?.status === 'ready'
              ? `${currency} ${formatMinorAmountInput(
                  totals.totals.totalAmount,
                  decimalPlaces
                )}`
              : `${currency} ${zeroMinorAmountInput(decimalPlaces)}`}
          </p>
          <p className="text-muted-foreground mt-3 text-xs">
            Saving records the sale and its settled payment together. It does
            not create an invoice, accounts receivable, or unused customer
            credit.
          </p>
        </aside>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating...' : 'Create sales receipt'}
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
  currencies: readonly SalesReceiptCreateCurrencyOption[],
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
