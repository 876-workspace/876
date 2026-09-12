'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  DocumentLineItemsEditor,
  formatMinorUnits,
  type DocumentItemOption,
  type DocumentLineDraft,
  type DocumentTotalsSnapshot,
} from '@876/billing-ui/document/document-line-items-editor'
import { prepareDocumentLine } from '@876/billing-ui/document/document-line-payload'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { AsyncCombobox, type AsyncComboboxOption } from '@876/ui/async-combobox'
import { Textarea } from '@876/ui/textarea'
import { cn } from '@876/ui/lib/utils'

import { emptyDocumentLine } from '../document-create-model'
import { client } from '@/lib/client'
import {
  formatMinorAmountInput,
  parseMinorAmountInput,
  parseSignedMinorAmountInput,
  minorAmountInputStep,
  zeroMinorAmountInput,
} from '@/lib/format'
import type { DocumentCustomerOption } from '@/types/customer'
import type { InvoiceStatus, InvoiceUpdateInput } from '@/types/invoice'
import { toDocumentCustomerOption } from '@/lib/customers/document-recipient'

type SelectOption = { label: string; value: string }
type CurrencyOption = SelectOption & { decimalPlaces: number }
type DocumentKind = 'invoice' | 'quote'

export interface InvoiceDocumentInitial {
  invoiceId: string
  status: InvoiceStatus
  values: InvoiceUpdateInput
  lines: DocumentLineDraft[]
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function futureInputValue(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

interface DocumentCreateFormProps {
  kind: DocumentKind
  items: DocumentItemOption[]
  priceLists?: SelectOption[]
  salespeople?: SelectOption[]
  currencies: CurrencyOption[]
  defaultCurrency: string
  returnUrl: string
  mode?: 'create' | 'edit'
  initialDocument?: InvoiceDocumentInitial
  onSubmit?: (
    params: InvoiceUpdateInput
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}

export function DocumentCreateForm(props: DocumentCreateFormProps) {
  if (props.mode === 'edit') {
    if (!props.initialDocument)
      throw new Error('An edit document requires initial values.')
    return (
      <InvoiceEditMode
        initialDocument={props.initialDocument}
        onSubmit={props.onSubmit}
      />
    )
  }
  return <DocumentCreateMode {...props} />
}

function DocumentCreateMode({
  kind,
  items,
  priceLists = [],
  salespeople = [],
  currencies,
  defaultCurrency,
  returnUrl,
}: DocumentCreateFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [selectedCustomer, setSelectedCustomer] =
    useState<DocumentCustomerOption | null>(null)
  const [currency, setCurrency] = useState(defaultCurrency)
  const [salespersonId, setSalespersonId] = useState('')
  const [priceListId, setPriceListId] = useState('')
  const [issueDate, setIssueDate] = useState(todayInputValue)
  const [endDate, setEndDate] = useState(() =>
    futureInputValue(kind === 'quote' ? 14 : 30)
  )
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [lines, setLines] = useState<DocumentLineDraft[]>([
    emptyDocumentLine('line-1'),
  ])
  const [totalsSnapshot, setTotalsSnapshot] =
    useState<DocumentTotalsSnapshot | null>(null)

  const title = kind === 'quote' ? 'Quote' : 'Invoice'
  const decimalPlaces =
    currencies.find((option) => option.value === currency)?.decimalPlaces ?? 2
  const editorItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        defaultAmount:
          item.defaultAmount !== null && item.currency === currency
            ? formatMinorAmountInput(item.defaultAmount, decimalPlaces)
            : null,
      })),
    [currency, decimalPlaces, items]
  )

  useEffect(() => {
    let cancelled = false

    if (!priceListId)
      return () => {
        cancelled = true
      }

    const targets = lines.flatMap((line) => {
      const quantity = Number(line.quantity)
      if (!line.priceId || !Number.isInteger(quantity) || quantity < 1)
        return []

      return [{ id: line.id, priceId: line.priceId, quantity }]
    })
    if (targets.length === 0)
      return () => {
        cancelled = true
      }

    void Promise.all(
      targets.map(async (target) => ({
        id: target.id,
        result: await client.priceLists.resolve(
          priceListId,
          target.priceId,
          target.quantity
        ),
      }))
    ).then((resolved) => {
      if (cancelled) return

      const amounts = new Map(
        resolved.flatMap(({ id, result }) =>
          result.data && result.data.currency === currency
            ? [
                [
                  id,
                  formatMinorAmountInput(result.data.amount, decimalPlaces),
                ] as const,
              ]
            : []
        )
      )
      setLines((current) => {
        if (
          !current.some(
            (line) =>
              amounts.has(line.id) &&
              amounts.get(line.id) !== line.resolvedSubtotal
          )
        )
          return current

        return current.map((line) => ({
          ...line,
          resolvedSubtotal: amounts.get(line.id) ?? null,
        }))
      })
    })

    return () => {
      cancelled = true
    }
  }, [currency, decimalPlaces, lines, priceListId])

  const searchCustomers = useCallback(
    async (query: string, signal: AbortSignal) => {
      const result = await client.customers.list(
        { q: query, limit: 20 },
        { signal }
      )
      if (result.error || !result.data)
        throw new Error(
          result.error?.message ?? 'Customers could not be loaded.'
        )

      return result.data.data.map((customer) => {
        const option = toDocumentCustomerOption(customer)
        return {
          value: option.value,
          label: option.label,
          description: customer.email ?? undefined,
          raw: option,
        }
      })
    },
    []
  )

  function handlePriceListChange(value: string) {
    setPriceListId(value)
    setLines((current) =>
      current.map((line) => ({ ...line, resolvedSubtotal: null }))
    )
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    if (!customerId) {
      setError('Select the customer this document is for.')
      return
    }

    if (totalsSnapshot?.status !== 'ready') {
      setError(
        totalsSnapshot?.status === 'invalid'
          ? totalsSnapshot.message
          : 'Line item totals are still being calculated.'
      )
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
            <CustomerPicker
              id={`billing-${kind}-customer`}
              value={customerId}
              selectedLabel={selectedCustomer?.label ?? ''}
              onSearch={searchCustomers}
              onValueChange={(value, customer) => {
                setCustomerId(value)
                setSelectedCustomer(customer)
                handlePriceListChange(customer?.priceListId ?? '')
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
              onChange={handlePriceListChange}
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

      <section className="876-card space-y-4 overflow-hidden p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold text-balance">Line items</h2>
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            Add every product or service included in this {kind}.
          </p>
        </div>
        <DocumentLineItemsEditor
          lines={lines}
          items={editorItems}
          enforceItemStock={kind === 'invoice'}
          onSearchItems={async (query, signal) => {
            const result = await client.items.list(
              { q: query, limit: 20 },
              { signal }
            )
            if (result.error || !result.data)
              throw new Error('catalogue search failed')

            return Promise.all(
              result.data.data.map(async (item) => {
                const variants =
                  item.variantMode === 'variant'
                    ? await client.items.listVariants(item.id)
                    : null
                if (variants?.error) throw new Error('variant search failed')

                return {
                  value: item.id,
                  label: item.name,
                  itemId: item.id,
                  priceId: null,
                  defaultAmount: item.defaultSellingAmount ?? null,
                  currency: item.defaultSellingCurrency ?? null,
                  trackStock: item.trackStock,
                  stockQuantity: item.stockQuantity,
                  allowOutOfStock: item.allowOutOfStock,
                  variants: variants?.data?.data.map((variant) => ({
                    id: variant.id,
                    label:
                      variant.options
                        .map((option) => option.value)
                        .join(' / ') || variant.name,
                    sku: variant.sku,
                    defaultAmount:
                      variant.defaultSellingAmount ??
                      item.defaultSellingAmount ??
                      null,
                    trackStock: item.trackStock,
                    stockQuantity: variant.stockQuantity,
                    allowOutOfStock: item.allowOutOfStock,
                  })),
                }
              })
            )
          }}
          minorUnitDigits={decimalPlaces}
          formatAmount={(amount) =>
            `${currency} ${formatMinorUnits(amount, decimalPlaces)}`
          }
          allowPercentageDiscount
          priceListActive={Boolean(priceListId)}
          onChange={setLines}
          onTotalsChange={setTotalsSnapshot}
        />
      </section>

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
        <Button
          type="submit"
          disabled={isPending || totalsSnapshot?.status !== 'ready'}
        >
          {isPending ? 'Saving…' : `Save draft ${title.toLowerCase()}`}
        </Button>
      </div>
    </form>
  )
}

function InvoiceEditMode({
  initialDocument,
  onSubmit,
}: {
  initialDocument: InvoiceDocumentInitial
  onSubmit?: (
    params: InvoiceUpdateInput
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [issueDate, setIssueDate] = useState(
    toEditDate(initialDocument.values.issueAt)
  )
  const [dueDate, setDueDate] = useState(
    toEditDate(initialDocument.values.dueAt)
  )
  const [referenceNumber, setReferenceNumber] = useState(
    initialDocument.values.referenceNumber ?? ''
  )
  const [orderNumber, setOrderNumber] = useState(
    initialDocument.values.orderNumber ?? ''
  )
  const [subject, setSubject] = useState(initialDocument.values.subject ?? '')
  const [notes, setNotes] = useState(initialDocument.values.notes ?? '')
  const [terms, setTerms] = useState(initialDocument.values.terms ?? '')
  const [lines, setLines] = useState(initialDocument.lines)
  const [totals, setTotals] = useState<DocumentTotalsSnapshot | null>(null)
  const restricted = initialDocument.status !== 'DRAFT'

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const dueAt = dateInputToUnix(dueDate)
    const issueAt = dateInputToUnix(issueDate)
    if (
      (dueDate && dueAt === null) ||
      (!restricted && issueDate && issueAt === null)
    ) {
      setError('Enter valid invoice dates.')
      return
    }
    const preparedLines = restricted
      ? []
      : lines.map((line) => prepareDocumentLine(line, 2, false))
    if (
      !restricted &&
      (totals?.status !== 'ready' ||
        preparedLines.some((line) => line === null))
    ) {
      setError(
        'Every line needs a description, positive quantity, and valid amounts.'
      )
      return
    }
    const payload: InvoiceUpdateInput = {
      dueAt,
      notes: notes.trim() || null,
      terms: terms.trim() || null,
      referenceNumber: referenceNumber.trim() || null,
      ...(!restricted
        ? {
            issueAt,
            orderNumber: orderNumber.trim() || null,
            subject: subject.trim() || null,
            lines: preparedLines.filter((line) => line !== null),
          }
        : {}),
    }
    setError(null)
    startTransition(async () => {
      const result = onSubmit
        ? await onSubmit(payload)
        : await client.invoices.update(initialDocument.invoiceId, payload)
      if (result.error) {
        setError(result.error.message)
        return
      }
      router.push(`/invoices/${initialDocument.invoiceId}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-6xl space-y-6">
      <section className="876-card grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        {!restricted ? (
          <EditDateField
            id="billing-invoice-edit-date"
            label="Invoice date"
            value={issueDate}
            onChange={setIssueDate}
            disabled={isPending}
          />
        ) : null}
        <EditDateField
          id="billing-invoice-edit-due-date"
          label="Due date"
          value={dueDate}
          onChange={setDueDate}
          disabled={isPending}
        />
        {!restricted ? (
          <EditTextField
            id="billing-invoice-edit-order-number"
            label="Order number"
            value={orderNumber}
            onChange={setOrderNumber}
            maxLength={120}
            disabled={isPending}
          />
        ) : null}
        <EditTextField
          id="billing-invoice-edit-reference"
          label="Reference"
          value={referenceNumber}
          onChange={setReferenceNumber}
          maxLength={120}
          disabled={isPending}
        />
        {!restricted ? (
          <EditTextField
            id="billing-invoice-edit-subject"
            label="Subject"
            value={subject}
            onChange={setSubject}
            maxLength={300}
            disabled={isPending}
          />
        ) : null}
      </section>
      {!restricted ? (
        <section className="876-card space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold">Line items</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Edit the products and services included in this invoice.
            </p>
          </div>
          <DocumentLineItemsEditor
            lines={lines}
            onChange={setLines}
            onTotalsChange={setTotals}
            formatAmount={formatMinorUnits}
            enforceItemStock
          />
        </section>
      ) : null}
      <section className="876-card grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <div className="space-y-2">
          <Label htmlFor="billing-invoice-edit-notes">Customer note</Label>
          <Textarea
            id="billing-invoice-edit-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billing-invoice-edit-terms">
            Terms and conditions
          </Label>
          <Textarea
            id="billing-invoice-edit-terms"
            value={terms}
            onChange={(event) => setTerms(event.target.value)}
            disabled={isPending}
          />
        </div>
      </section>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2 pb-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/invoices/${initialDocument.invoiceId}`)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save invoice'}
        </Button>
      </div>
    </form>
  )
}

function toEditDate(value: number | null | undefined) {
  return value ? new Date(value * 1_000).toISOString().slice(0, 10) : ''
}

function EditDateField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  )
}

function EditTextField({
  id,
  label,
  value,
  onChange,
  maxLength,
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  maxLength: number
  disabled: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        disabled={disabled}
      />
    </div>
  )
}

function CustomerPicker({
  id,
  value,
  selectedLabel,
  onSearch,
  onValueChange,
}: {
  id: string
  value: string
  selectedLabel: string
  onSearch: (
    query: string,
    signal: AbortSignal
  ) => Promise<AsyncComboboxOption[]>
  onValueChange: (value: string, option: DocumentCustomerOption | null) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Customer</Label>
      <AsyncCombobox
        id={id}
        ariaLabel="Customer"
        value={value}
        selectedLabel={selectedLabel}
        onValueChange={(next, option) =>
          onValueChange(next, (option?.raw as DocumentCustomerOption) ?? null)
        }
        onSearch={onSearch}
        placeholder="Search customers…"
        emptyMessage="No customers found."
      />
    </div>
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
