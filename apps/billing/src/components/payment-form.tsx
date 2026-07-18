'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import {
  formatMinorAmountInput,
  formatMoney,
  minorAmountInputStep,
  parseMinorAmountInput,
  unixTimestampToDateInput,
  zeroMinorAmountInput,
} from '@/lib/format'

interface CurrencyOption {
  value: string
  label: string
  decimalPlaces: number
}

interface PaymentOption {
  value: string
  label: string
}

interface AccountOption extends PaymentOption {
  currency: string
}

interface InvoiceOption {
  id: string
  customerId: string
  number: string
  currency: string
  amountDue: string
}

interface InitialPayment {
  id: string
  number: string
  customerId: string
  paymentModeId: string
  depositAccountId: string
  amount: string
  bankCharges: string
  currency: string
  paymentDate: number
  referenceNumber: string | null
  notes: string | null
  allocations: Array<{ invoiceId: string; amount: string }>
}

export function PaymentForm({
  customers,
  accounts,
  modes,
  currencies,
  invoices,
  defaultCurrency,
  initial,
}: {
  customers: PaymentOption[]
  accounts: AccountOption[]
  modes: PaymentOption[]
  currencies: CurrencyOption[]
  invoices: InvoiceOption[]
  defaultCurrency: string
  initial?: InitialPayment
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [now] = useState(Date.now)
  const [error, setError] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState(initial?.customerId ?? '')
  const [currency, setCurrency] = useState(initial?.currency ?? defaultCurrency)
  const [accountId, setAccountId] = useState(initial?.depositAccountId ?? '')
  const [modeId, setModeId] = useState(
    initial?.paymentModeId ?? modes[0]?.value ?? ''
  )
  const [amount, setAmount] = useState(() =>
    initial
      ? formatMinorAmountInput(
          initial.amount,
          currencyDecimals(currencies, initial.currency)
        )
      : ''
  )
  const [bankCharges, setBankCharges] = useState(() =>
    initial
      ? formatMinorAmountInput(
          initial.bankCharges,
          currencyDecimals(currencies, initial.currency)
        )
      : zeroMinorAmountInput(currencyDecimals(currencies, defaultCurrency))
  )
  const [paymentDate, setPaymentDate] = useState(
    unixTimestampToDateInput(initial?.paymentDate ?? now / 1000)
  )
  const [referenceNumber, setReferenceNumber] = useState(
    initial?.referenceNumber ?? ''
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [allocations, setAllocations] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (initial?.allocations ?? []).map((allocation) => [
        allocation.invoiceId,
        formatMinorAmountInput(
          allocation.amount,
          currencyDecimals(currencies, initial?.currency ?? defaultCurrency)
        ),
      ])
    )
  )

  const decimalPlaces = currencyDecimals(currencies, currency)
  const availableAccounts = accounts.filter(
    (account) => account.currency === currency
  )
  const availableInvoices = invoices.filter(
    (invoice) =>
      invoice.customerId === customerId && invoice.currency === currency
  )
  const allocatedPreview = availableInvoices.reduce((total, invoice) => {
    const value = parseMinorAmountInput(
      allocations[invoice.id] ?? '',
      decimalPlaces,
      true
    )
    return total + BigInt(value ?? 0)
  }, 0n)

  function changeCustomer(value: string) {
    setCustomerId(value)
    setAllocations({})
  }

  function changeCurrency(value: string) {
    setCurrency(value)
    setAccountId('')
    setAllocations({})
    setAmount('')
    setBankCharges(zeroMinorAmountInput(currencyDecimals(currencies, value)))
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const paymentAmount = parseMinorAmountInput(amount, decimalPlaces)
    const charges = parseMinorAmountInput(bankCharges, decimalPlaces, true)
    const parsedAllocations = availableInvoices.flatMap((invoice) => {
      const allocation = parseMinorAmountInput(
        allocations[invoice.id] ?? '',
        decimalPlaces,
        true
      )
      return allocation && BigInt(allocation) > 0n
        ? [{ invoiceId: invoice.id, amount: allocation }]
        : []
    })
    const allocatedTotal = parsedAllocations.reduce(
      (total, allocation) => total + BigInt(allocation.amount),
      0n
    )

    if (!customerId || !modeId || !accountId || !paymentAmount || !charges) {
      setError('Complete the customer, payment, mode, and deposit fields.')
      return
    }
    if (BigInt(charges) >= BigInt(paymentAmount)) {
      setError('Bank charges must be less than the payment amount.')
      return
    }
    if (parsedAllocations.length === 0) {
      setError('Allocate at least part of the payment to an invoice.')
      return
    }
    if (allocatedTotal > BigInt(paymentAmount)) {
      setError('Invoice allocations cannot exceed the payment amount.')
      return
    }

    const timestamp = Math.floor(Date.parse(`${paymentDate}T00:00:00Z`) / 1000)
    if (!Number.isInteger(timestamp)) {
      setError('Enter a valid payment date.')
      return
    }

    setError(null)
    startTransition(async () => {
      const params = {
        customerId,
        paymentModeId: modeId,
        depositAccountId: accountId,
        amount: paymentAmount,
        bankCharges: charges,
        currency,
        paymentDate: timestamp,
        referenceNumber: referenceNumber.trim() || null,
        notes: notes.trim() || null,
        allocations: parsedAllocations,
      }
      const result = initial
        ? await client.payments.update(initial.id, params)
        : await client.payments.create(params)
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Failed to save the payment.')
        return
      }
      router.push(initial ? `/payments/${initial.id}` : '/payments')
      router.refresh()
    })
  }

  function remove() {
    if (!initial || !window.confirm('Delete and reverse this payment?')) return

    startTransition(async () => {
      const result = await client.payments.delete(initial.id)
      if (result.error) {
        setError(result.error.message)
        return
      }
      router.push('/payments')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="876-card grid gap-5 p-5 sm:grid-cols-2">
          <Field label="Customer" htmlFor="payment-customer">
            <NativeSelect
              id="payment-customer"
              value={customerId}
              onChange={(event) => changeCustomer(event.target.value)}
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
          <Field label="Currency" htmlFor="payment-currency">
            <NativeSelect
              id="payment-currency"
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
          <Field label="Amount received" htmlFor="payment-amount">
            <Input
              id="payment-amount"
              type="number"
              min={minorAmountInputStep(decimalPlaces)}
              step={minorAmountInputStep(decimalPlaces)}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </Field>
          <Field label="Bank charges" htmlFor="payment-bank-charges">
            <Input
              id="payment-bank-charges"
              type="number"
              min="0"
              step={minorAmountInputStep(decimalPlaces)}
              value={bankCharges}
              onChange={(event) => setBankCharges(event.target.value)}
            />
          </Field>
          <Field label="Payment date" htmlFor="payment-date">
            <Input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              required
            />
          </Field>
          <Field label="Payment number" htmlFor="payment-number">
            <Input
              id="payment-number"
              value={initial?.number ?? 'Generated when saved'}
              disabled
            />
          </Field>
          <Field label="Payment mode" htmlFor="payment-mode">
            <NativeSelect
              id="payment-mode"
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
          <Field label="Deposit to" htmlFor="payment-account">
            <NativeSelect
              id="payment-account"
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
          <Field label="Reference number" htmlFor="payment-reference">
            <Input
              id="payment-reference"
              value={referenceNumber}
              onChange={(event) => setReferenceNumber(event.target.value)}
            />
          </Field>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="payment-notes">Notes</Label>
            <Textarea
              id="payment-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>
        </div>

        <aside className="876-card h-fit p-5">
          <p className="876-eyebrow">Payment summary</p>
          <dl className="mt-4 space-y-3 text-sm">
            <SummaryRow
              label="Received"
              value={amount || zeroMinorAmountInput(decimalPlaces)}
            />
            <SummaryRow
              label="Bank charges"
              value={bankCharges || zeroMinorAmountInput(decimalPlaces)}
            />
            <SummaryRow
              label="Allocated"
              value={formatMinorAmountInput(allocatedPreview, decimalPlaces)}
            />
          </dl>
          <p className="text-muted-foreground mt-4 text-xs">
            All amounts are recorded in {currency}. Unallocated money remains on
            the payment but does not reduce an invoice balance.
          </p>
        </aside>
      </div>

      <section className="876-card overflow-hidden">
        <div className="border-border border-b px-5 py-4">
          <h2 className="font-semibold">Invoice allocations</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Distribute the received amount across this customer&apos;s open
            invoices.
          </p>
        </div>
        {!customerId ? (
          <p className="text-muted-foreground px-5 py-10 text-center text-sm">
            Select a customer to see open invoices.
          </p>
        ) : availableInvoices.length === 0 ? (
          <p className="text-muted-foreground px-5 py-10 text-center text-sm">
            This customer has no open invoices in {currency}.
          </p>
        ) : (
          <div className="divide-border divide-y">
            {availableInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_12rem] sm:items-center"
              >
                <div>
                  <p className="font-medium">{invoice.number}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {formatMoney(
                      invoice.amountDue,
                      invoice.currency,
                      decimalPlaces
                    )}{' '}
                    due
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`allocation-${invoice.id}`}>Apply</Label>
                  <Input
                    id={`allocation-${invoice.id}`}
                    type="number"
                    min="0"
                    step={minorAmountInputStep(decimalPlaces)}
                    value={allocations[invoice.id] ?? ''}
                    onChange={(event) =>
                      setAllocations((current) => ({
                        ...current,
                        [invoice.id]: event.target.value,
                      }))
                    }
                    placeholder={zeroMinorAmountInput(decimalPlaces)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : initial ? 'Save' : 'Create'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        {initial ? (
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={remove}
            className="ml-auto"
          >
            Delete
          </Button>
        ) : null}
      </div>
    </form>
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono font-medium tabular-nums">{value}</dd>
    </div>
  )
}

function currencyDecimals(
  currencies: CurrencyOption[],
  currency: string
): number {
  return (
    currencies.find((option) => option.value === currency)?.decimalPlaces ?? 2
  )
}
