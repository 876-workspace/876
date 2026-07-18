'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'
import { cn } from '@876/ui/lib/utils'

import {
  emptyDocumentLine,
  prepareDocumentLine,
  type DocumentItemOption,
  type EditableDocumentLine,
} from '@/components/document-create-model'
import { DocumentLineEditor } from '@/components/document-line-editor'
import { client } from '@/lib/client'
import {
  parseMinorAmountInput,
  parseSignedMinorAmountInput,
  minorAmountInputStep,
  zeroMinorAmountInput,
} from '@/lib/format'
import type { DocumentCustomerOption } from '@/types/customer'

type SelectOption = { label: string; value: string }
type CurrencyOption = SelectOption & { decimalPlaces: number }
type DocumentKind = 'invoice' | 'quote'

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function futureInputValue(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function DocumentCreateForm({
  kind,
  customers,
  items,
  priceLists = [],
  salespeople = [],
  currencies,
  defaultCurrency,
  returnUrl,
}: {
  kind: DocumentKind
  customers: DocumentCustomerOption[]
  items: DocumentItemOption[]
  priceLists?: SelectOption[]
  salespeople?: SelectOption[]
  currencies: CurrencyOption[]
  defaultCurrency: string
  returnUrl: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [currency, setCurrency] = useState(defaultCurrency)
  const [salespersonId, setSalespersonId] = useState('')
  const [priceListId, setPriceListId] = useState('')
  const [issueDate, setIssueDate] = useState(todayInputValue)
  const [endDate, setEndDate] = useState(() =>
    futureInputValue(kind === 'quote' ? 14 : 30)
  )
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [lines, setLines] = useState<EditableDocumentLine[]>([
    emptyDocumentLine('line-1'),
  ])

  const title = kind === 'quote' ? 'Quote' : 'Invoice'
  const selectedCustomer = customers.find(
    (customer) => customer.value === customerId
  )
  const decimalPlaces =
    currencies.find((option) => option.value === currency)?.decimalPlaces ?? 2
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    if (!customerId) {
      setError('Select the customer this document is for.')
      return
    }

    const preparedLines = lines.map((line) =>
      prepareDocumentLine(line, decimalPlaces, Boolean(priceListId))
    )
    if (preparedLines.some((line) => line === null)) {
      setError(
        'Every line needs a description, positive quantity, and valid amounts.'
      )
      return
    }

    const issueAt = dateInputToUnix(issueDate)
    const endAt = kind === 'quote' ? dateInputToUnix(endDate) : null
    if (
      issueAt === null ||
      (kind === 'quote' && (endAt === null || endAt < issueAt))
    ) {
      setError('Enter a valid expiry date on or after the quote date.')
      return
    }

    const invoiceDiscount = parseMinorAmountInput(
      String(formData.get('invoiceDiscount') ?? '0'),
      decimalPlaces,
      true
    )
    const shippingAmount = parseMinorAmountInput(
      String(formData.get('shippingAmount') ?? '0'),
      decimalPlaces,
      true
    )
    const adjustmentAmount = parseSignedMinorAmountInput(
      String(formData.get('adjustmentAmount') ?? '0'),
      decimalPlaces
    )
    if (
      kind === 'invoice' &&
      (invoiceDiscount === null ||
        shippingAmount === null ||
        adjustmentAmount === null)
    ) {
      setError(
        'Enter valid invoice discount, shipping, and adjustment amounts.'
      )
      return
    }

    setError(null)
    startTransition(async () => {
      const common = {
        customerId,
        priceListId: priceListId || null,
        currency,
        issueAt,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        lines: preparedLines.filter((line) => line !== null),
      }
      const result =
        kind === 'quote'
          ? await client.quotes.create({ ...common, expiresAt: endAt! })
          : await client.invoices.create({
              ...common,
              salespersonId: salespersonId || null,
              orderNumber:
                String(formData.get('orderNumber') ?? '').trim() || null,
              referenceNumber:
                String(formData.get('referenceNumber') ?? '').trim() || null,
              subject: String(formData.get('subject') ?? '').trim() || null,
              discountAmount: invoiceDiscount!,
              shippingAmount: shippingAmount!,
              adjustmentAmount: adjustmentAmount!,
            })
      if (result.error || !result.data) {
        setError(
          result.error?.message ?? `Failed to create ${title.toLowerCase()}.`
        )
        return
      }

      router.push(`${returnUrl}/${result.data.id}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-6xl space-y-6">
      <section className="876-card overflow-hidden">
        <header className="bg-muted/35 border-border flex items-center justify-between gap-4 border-b px-5 py-3 sm:px-6">
          <h2 className="text-base font-semibold text-balance">
            Draft {title.toLowerCase()}
          </h2>
          <p className="text-muted-foreground text-right font-mono text-xs">
            Number assigned on save
          </p>
        </header>

        <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.85fr)]">
          <div className="p-5 sm:p-6">
            <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
              {kind === 'quote' ? 'Prepared for' : 'Bill to'}
            </p>
            <SelectField
              id={`billing-${kind}-customer`}
              label="Customer"
              value={customerId}
              options={customers}
              onChange={(value) => {
                setCustomerId(value)
                setPriceListId(
                  customers.find((customer) => customer.value === value)
                    ?.priceListId ?? ''
                )
              }}
            />
            {selectedCustomer ? (
              <CustomerRecipientDetails customer={selectedCustomer} />
            ) : (
              <p className="text-muted-foreground border-border mt-4 border-t pt-4 text-sm text-pretty">
                Customer contact and billing address appear here after
                selection.
              </p>
            )}
          </div>

          <div className="border-border grid content-start gap-4 border-t p-5 sm:grid-cols-2 sm:p-6 lg:border-t-0 lg:border-l">
            <div className="space-y-2">
              <Label htmlFor={`billing-${kind}-issue-date`}>
                {kind === 'quote' ? 'Quote date' : 'Invoice date'}
              </Label>
              <Input
                id={`billing-${kind}-issue-date`}
                type="date"
                value={issueDate}
                onChange={(event) => setIssueDate(event.target.value)}
              />
            </div>
            {kind === 'quote' ? (
              <div className="space-y-2">
                <Label htmlFor="billing-quote-end-date">Expires on</Label>
                <Input
                  id="billing-quote-end-date"
                  type="date"
                  value={endDate}
                  min={issueDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            ) : null}
            <SelectField
              id={`billing-${kind}-currency`}
              label="Currency"
              value={currency}
              options={currencies}
              onChange={setCurrency}
            />
            <SelectField
              id={`billing-${kind}-price-list`}
              label="Price list (optional)"
              value={priceListId}
              options={priceLists}
              onChange={setPriceListId}
            />
            {kind === 'invoice' ? (
              <>
                <div className="sm:col-span-2">
                  <SelectField
                    id="billing-invoice-salesperson"
                    label="Salesperson (optional)"
                    value={salespersonId}
                    options={salespeople}
                    onChange={setSalespersonId}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing-invoice-order-number">
                    Order number
                  </Label>
                  <Input
                    id="billing-invoice-order-number"
                    name="orderNumber"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing-invoice-reference-number">
                    Reference
                  </Label>
                  <Input
                    id="billing-invoice-reference-number"
                    name="referenceNumber"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="billing-invoice-subject">Subject</Label>
                  <Input
                    id="billing-invoice-subject"
                    name="subject"
                    maxLength={300}
                  />
                </div>
              </>
            ) : null}
            <div className="border-border flex items-center justify-between gap-4 border-t pt-3 sm:col-span-2">
              <p className="text-muted-foreground text-xs">Payment terms</p>
              <p className="text-right text-sm font-medium">
                {kind === 'invoice'
                  ? 'Due on receipt · set when finalized'
                  : 'Set when converted to an invoice'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <DocumentLineEditor
        kind={kind}
        lines={lines}
        items={items}
        currency={currency}
        priceListId={priceListId}
        decimalPlaces={decimalPlaces}
        onChange={setLines}
      />

      <section className="876-card grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <div className="space-y-2">
          <Label htmlFor={`billing-${kind}-notes`}>Customer note</Label>
          <Textarea
            id={`billing-${kind}-notes`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Thank you for your business."
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`billing-${kind}-terms`}>Terms and conditions</Label>
          <Textarea
            id={`billing-${kind}-terms`}
            value={terms}
            onChange={(event) => setTerms(event.target.value)}
            placeholder="Payment terms or conditions shown on the document."
            rows={4}
          />
        </div>
      </section>

      {kind === 'invoice' ? (
        <section className="876-card space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="font-semibold text-balance">Invoice adjustments</h2>
            <p className="text-muted-foreground mt-1 text-xs text-pretty">
              Header adjustments are snapshotted separately for reporting and
              reconciliation.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="billing-invoice-discount">Invoice discount</Label>
              <Input
                id="billing-invoice-discount"
                name="invoiceDiscount"
                type="number"
                min="0"
                step={minorAmountInputStep(decimalPlaces)}
                defaultValue={zeroMinorAmountInput(decimalPlaces)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing-invoice-shipping">Shipping</Label>
              <Input
                id="billing-invoice-shipping"
                name="shippingAmount"
                type="number"
                min="0"
                step={minorAmountInputStep(decimalPlaces)}
                defaultValue={zeroMinorAmountInput(decimalPlaces)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing-invoice-adjustment">Adjustment</Label>
              <Input
                id="billing-invoice-adjustment"
                name="adjustmentAmount"
                type="number"
                step={minorAmountInputStep(decimalPlaces)}
                defaultValue={zeroMinorAmountInput(decimalPlaces)}
              />
            </div>
          </div>
        </section>
      ) : null}

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2 pb-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(returnUrl)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : `Save draft ${title.toLowerCase()}`}
        </Button>
      </div>
    </form>
  )
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full"
      >
        <NativeSelectOption value="">Select…</NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}

function CustomerRecipientDetails({
  customer,
}: {
  customer: DocumentCustomerOption
}) {
  const locality = [
    customer.address?.city,
    customer.address?.state,
    customer.address?.postalCode,
    customer.address?.countryCode,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="border-border mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Recipient
        </p>
        {customer.organizationName ? (
          <p className="mt-1.5 text-sm font-semibold text-balance">
            {customer.organizationName}
          </p>
        ) : null}
        {customer.contactName ? (
          <p
            className={cn(
              customer.organizationName
                ? 'mt-0.5 text-sm'
                : 'mt-1.5 text-sm font-semibold'
            )}
          >
            {customer.contactName}
          </p>
        ) : null}
        {customer.email || customer.phone ? (
          <p className="text-muted-foreground mt-1.5 text-xs">
            {[customer.email, customer.phone].filter(Boolean).join(' · ')}
          </p>
        ) : null}
      </div>
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Primary billing address
        </p>
        {customer.address ? (
          <div className="mt-1.5 text-xs leading-5">
            {customer.address.label ? (
              <p className="font-medium">{customer.address.label}</p>
            ) : null}
            {customer.address.attention ? (
              <p>{customer.address.attention}</p>
            ) : null}
            {customer.address.line1 ? <p>{customer.address.line1}</p> : null}
            {customer.address.line2 ? <p>{customer.address.line2}</p> : null}
            {locality ? <p>{locality}</p> : null}
          </div>
        ) : (
          <p className="text-muted-foreground mt-1.5 text-xs">
            No primary billing address on file.
          </p>
        )}
      </div>
    </div>
  )
}

function dateInputToUnix(value: string) {
  const milliseconds = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isFinite(milliseconds) ? Math.floor(milliseconds / 1000) : null
}
