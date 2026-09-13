'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  DocumentLineItemsEditor,
  formatMinorUnits,
  type DocumentItemOption,
  type DocumentLineDraft,
  type DocumentTaxRateOption,
  type DocumentTotalsSnapshot,
} from '@876/billing-ui/document/document-line-items-editor'
import { prepareDocumentLine } from '@876/billing-ui/document/document-line-payload'
import {
  DocumentFormFooter,
  documentFooterTotal,
  documentTotalQuantity,
} from '@876/billing-ui/document/document-form-footer'
import {
  DocumentFormBand,
  DocumentFormSection,
  DocumentFormSummaryGrid,
  DocumentNotesField,
  DocumentTermsField,
} from '@876/billing-ui/document/document-form-layout'
import {
  DocumentPaymentTermsControl,
  resolveTermDueDate,
  type DocumentPaymentTerm,
} from '@876/billing-ui/document/document-payment-terms'
import {
  DocumentTotalsSummary,
  parseDocumentAdjustments,
  type DocumentAdjustmentDraft,
} from '@876/billing-ui/document/document-totals-summary'
import { AppError } from '@876/ui/app-error'
import { AsyncCombobox } from '@876/ui/async-combobox'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'
import { cn } from '@876/ui/lib/utils'

import { emptyDocumentLine } from '../document-create-model'
import { client } from '@/lib/client'
import { formatMinorAmountInput } from '@/lib/format'
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

const EMPTY_ADJUSTMENTS: DocumentAdjustmentDraft = {
  discount: '',
  shipping: '',
  adjustment: '',
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
  taxRates?: DocumentTaxRateOption[]
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
        taxRates={props.taxRates}
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
  taxRates,
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
  const [term, setTerm] = useState<DocumentPaymentTerm>('due-on-receipt')
  const [endDate, setEndDate] = useState(() =>
    kind === 'quote' ? futureInputValue(14) : todayInputValue()
  )
  const [orderNumber, setOrderNumber] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [subject, setSubject] = useState('')
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [adjustments, setAdjustments] = useState(EMPTY_ADJUSTMENTS)
  const [lines, setLines] = useState<DocumentLineDraft[]>([
    emptyDocumentLine('line-1'),
  ])
  const [totalsSnapshot, setTotalsSnapshot] =
    useState<DocumentTotalsSnapshot | null>(null)

  const title = kind === 'quote' ? 'Quote' : 'Invoice'
  const decimalPlaces =
    currencies.find((option) => option.value === currency)?.decimalPlaces ?? 2
  const parsedAdjustments =
    kind === 'invoice'
      ? parseDocumentAdjustments(adjustments, decimalPlaces)
      : { discount: 0n, shipping: 0n, adjustment: 0n }
  const formatAmount = (amount: bigint) =>
    `${currency} ${formatMinorUnits(amount, decimalPlaces)}`
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

  function handleIssueDateChange(value: string) {
    setIssueDate(value)
    if (kind === 'invoice') {
      const due = resolveTermDueDate(term, value)
      if (due) setEndDate(due)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
    const endAt = dateInputToUnix(endDate)
    if (issueAt === null || endAt === null || endAt < issueAt) {
      setError(
        kind === 'quote'
          ? 'Enter a valid expiry date on or after the quote date.'
          : 'Enter a valid due date on or after the invoice date.'
      )
      return
    }

    if (!parsedAdjustments) {
      setError('Enter valid discount, shipping, and adjustment amounts.')
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
          ? await client.quotes.create({ ...common, expiresAt: endAt })
          : await client.invoices.create({
              ...common,
              dueAt: endAt,
              salespersonId: salespersonId || null,
              orderNumber: orderNumber.trim() || null,
              referenceNumber: referenceNumber.trim() || null,
              subject: subject.trim() || null,
              discountAmount: parsedAdjustments.discount.toString(),
              shippingAmount: parsedAdjustments.shipping.toString(),
              adjustmentAmount: parsedAdjustments.adjustment.toString(),
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
    <form onSubmit={handleSubmit} className="flex flex-col">
      <DocumentFormBand>
        <FormRow htmlFor={`billing-${kind}-customer`} label="Customer" required>
          <div className="max-w-2xl">
            <AsyncCombobox
              id={`billing-${kind}-customer`}
              ariaLabel="Customer"
              value={customerId}
              selectedLabel={selectedCustomer?.label ?? ''}
              onValueChange={(value, option) => {
                const customer =
                  (option?.raw as DocumentCustomerOption | undefined) ?? null
                setCustomerId(value)
                setSelectedCustomer(customer)
                handlePriceListChange(customer?.priceListId ?? '')
              }}
              onSearch={searchCustomers}
              placeholder="Select or search a customer"
              emptyMessage="No customers found."
              disabled={isPending}
            />
            {selectedCustomer ? (
              <CustomerRecipientDetails customer={selectedCustomer} />
            ) : null}
          </div>
        </FormRow>
      </DocumentFormBand>

      <DocumentFormSection>
        <FormRow label={`${title} #`}>
          <Input
            aria-label={`${title} number`}
            value="Assigned on save"
            readOnly
            tabIndex={-1}
            className={`${FIELD_WIDTH} text-muted-foreground`}
          />
        </FormRow>
        {kind === 'invoice' ? (
          <FormRow htmlFor="billing-invoice-order-number" label="Order number">
            <Input
              id="billing-invoice-order-number"
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              maxLength={120}
              disabled={isPending}
              className={FIELD_WIDTH}
            />
          </FormRow>
        ) : null}
        <FormRow
          htmlFor={`billing-${kind}-issue-date`}
          label={`${title} date`}
          required
        >
          <div className="grid gap-3 xl:grid-cols-[minmax(0,28rem)_minmax(0,30rem)] xl:items-center">
            <Input
              id={`billing-${kind}-issue-date`}
              type="date"
              value={issueDate}
              onChange={(event) => handleIssueDateChange(event.target.value)}
              disabled={isPending}
            />
            {kind === 'invoice' ? (
              <DocumentPaymentTermsControl
                idPrefix="billing-invoice"
                issueDate={issueDate}
                term={term}
                dueDate={endDate}
                disabled={isPending}
                onChange={(next) => {
                  setTerm(next.term)
                  setEndDate(next.dueDate)
                }}
              />
            ) : null}
          </div>
        </FormRow>
        {kind === 'quote' ? (
          <FormRow htmlFor="billing-quote-end-date" label="Expiry date">
            <Input
              id="billing-quote-end-date"
              type="date"
              value={endDate}
              min={issueDate}
              onChange={(event) => setEndDate(event.target.value)}
              disabled={isPending}
              className={FIELD_WIDTH}
            />
          </FormRow>
        ) : null}
      </DocumentFormSection>

      <DocumentFormSection>
        {kind === 'invoice' ? (
          <SelectRow
            id="billing-invoice-salesperson"
            label="Salesperson"
            placeholder="Select a salesperson"
            value={salespersonId}
            options={salespeople}
            onChange={setSalespersonId}
            disabled={isPending}
          />
        ) : null}
        <SelectRow
          id={`billing-${kind}-currency`}
          label="Currency"
          value={currency}
          options={currencies}
          onChange={setCurrency}
          disabled={isPending}
        />
        <SelectRow
          id={`billing-${kind}-price-list`}
          label="Price list"
          ariaLabel="Price list (optional)"
          placeholder="No price list"
          value={priceListId}
          options={priceLists}
          onChange={handlePriceListChange}
          disabled={isPending}
        />
        {kind === 'invoice' ? (
          <>
            <FormRow
              htmlFor="billing-invoice-reference-number"
              label="Reference"
            >
              <Input
                id="billing-invoice-reference-number"
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
                maxLength={120}
                disabled={isPending}
                className={FIELD_WIDTH}
              />
            </FormRow>
            <FormRow htmlFor="billing-invoice-subject" label="Subject">
              <Textarea
                id="billing-invoice-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={300}
                rows={2}
                placeholder="Let your customer know what this invoice is for"
                disabled={isPending}
                className="max-w-2xl"
              />
            </FormRow>
          </>
        ) : null}
      </DocumentFormSection>

      <DocumentFormSection className="space-y-6">
        <DocumentLineItemsEditor
          title="Item table"
          bleed
          lines={lines}
          items={editorItems}
          enforceItemStock={kind === 'invoice'}
          onSearchItems={searchCatalogue}
          minorUnitDigits={decimalPlaces}
          formatAmount={formatAmount}
          currency={currency}
          allowPercentageDiscount
          taxRates={taxRates}
          priceListActive={Boolean(priceListId)}
          discountAmount={parsedAdjustments?.discount}
          shippingAmount={parsedAdjustments?.shipping}
          adjustmentAmount={parsedAdjustments?.adjustment}
          showTotals={false}
          onChange={setLines}
          onTotalsChange={setTotalsSnapshot}
        />

        <DocumentFormSummaryGrid>
          <DocumentNotesField
            id={`billing-${kind}-notes`}
            value={notes}
            onChange={setNotes}
            disabled={isPending}
          />
          <DocumentTotalsSummary
            snapshot={totalsSnapshot}
            formatAmount={formatAmount}
            currency={currency}
            idPrefix={`billing-${kind}`}
            adjustments={
              kind === 'invoice'
                ? {
                    values: adjustments,
                    onChange: (patch) =>
                      setAdjustments((current) => ({ ...current, ...patch })),
                    disabled: isPending,
                  }
                : undefined
            }
          />
        </DocumentFormSummaryGrid>
      </DocumentFormSection>

      <DocumentTermsField
        id={`billing-${kind}-terms`}
        value={terms}
        onChange={setTerms}
        disabled={isPending}
      />

      {error ? (
        <AppError
          error={{ code: `${kind}/create-failed`, message: error }}
          variant="form"
          className="mt-4"
        />
      ) : null}

      <DocumentFormFooter
        totalAmount={documentFooterTotal(totalsSnapshot, formatAmount)}
        totalQuantity={documentTotalQuantity(lines)}
      >
        <Button
          type="submit"
          variant="info"
          disabled={isPending || totalsSnapshot?.status !== 'ready'}
        >
          {isPending ? 'Saving…' : 'Save as draft'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(returnUrl)}
          disabled={isPending}
        >
          Cancel
        </Button>
      </DocumentFormFooter>
    </form>
  )
}

function InvoiceEditMode({
  initialDocument,
  taxRates,
  onSubmit,
}: {
  initialDocument: InvoiceDocumentInitial
  taxRates?: DocumentTaxRateOption[]
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
  const [term, setTerm] = useState<DocumentPaymentTerm>('custom')
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
  const detailHref = `/invoices/${initialDocument.invoiceId}`

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
      router.push(detailHref)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col">
      <DocumentFormSection className="pt-0">
        {!restricted ? (
          <FormRow
            htmlFor="billing-invoice-edit-order-number"
            label="Order number"
          >
            <Input
              id="billing-invoice-edit-order-number"
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              maxLength={120}
              disabled={isPending}
              className={FIELD_WIDTH}
            />
          </FormRow>
        ) : null}
        <FormRow
          htmlFor={
            restricted
              ? 'billing-invoice-edit-due-date'
              : 'billing-invoice-edit-date'
          }
          label={restricted ? 'Due date' : 'Invoice date'}
        >
          <div className="grid gap-3 xl:grid-cols-[minmax(0,28rem)_minmax(0,30rem)] xl:items-center">
            {!restricted ? (
              <Input
                id="billing-invoice-edit-date"
                type="date"
                aria-label="Invoice date"
                value={issueDate}
                onChange={(event) => {
                  setIssueDate(event.target.value)
                  const due = resolveTermDueDate(term, event.target.value)
                  if (due) setDueDate(due)
                }}
                disabled={isPending}
              />
            ) : null}
            <DocumentPaymentTermsControl
              idPrefix="billing-invoice-edit"
              issueDate={issueDate}
              term={term}
              dueDate={dueDate}
              disabled={isPending}
              onChange={(next) => {
                setTerm(next.term)
                setDueDate(next.dueDate)
              }}
            />
          </div>
        </FormRow>
      </DocumentFormSection>

      <DocumentFormSection>
        <FormRow htmlFor="billing-invoice-edit-reference" label="Reference">
          <Input
            id="billing-invoice-edit-reference"
            value={referenceNumber}
            onChange={(event) => setReferenceNumber(event.target.value)}
            maxLength={120}
            disabled={isPending}
            className={FIELD_WIDTH}
          />
        </FormRow>
        {!restricted ? (
          <FormRow htmlFor="billing-invoice-edit-subject" label="Subject">
            <Textarea
              id="billing-invoice-edit-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={300}
              rows={2}
              disabled={isPending}
              className="max-w-2xl"
            />
          </FormRow>
        ) : null}
      </DocumentFormSection>

      <DocumentFormSection className="space-y-6">
        {!restricted ? (
          <DocumentLineItemsEditor
            title="Item table"
            bleed
            lines={lines}
            onChange={setLines}
            onTotalsChange={setTotals}
            formatAmount={formatMinorUnits}
            taxRates={taxRates}
            allowPercentageDiscount
            showTotals={false}
            enforceItemStock
          />
        ) : null}
        <DocumentFormSummaryGrid>
          <DocumentNotesField
            id="billing-invoice-edit-notes"
            value={notes}
            onChange={setNotes}
            disabled={isPending}
          />
          {!restricted ? (
            <DocumentTotalsSummary
              snapshot={totals}
              formatAmount={formatMinorUnits}
            />
          ) : null}
        </DocumentFormSummaryGrid>
      </DocumentFormSection>

      <DocumentTermsField
        id="billing-invoice-edit-terms"
        value={terms}
        onChange={setTerms}
        disabled={isPending}
      />

      {error ? (
        <AppError
          error={{ code: 'invoice/update-failed', message: error }}
          variant="form"
          className="mt-4"
        />
      ) : null}

      <DocumentFormFooter
        totalAmount={
          restricted ? '—' : documentFooterTotal(totals, formatMinorUnits)
        }
        totalQuantity={restricted ? 0 : documentTotalQuantity(lines)}
      >
        <Button type="submit" variant="info" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save invoice'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(detailHref)}
          disabled={isPending}
        >
          Cancel
        </Button>
      </DocumentFormFooter>
    </form>
  )
}

const FIELD_WIDTH = 'max-w-md'

async function searchCatalogue(query: string, signal: AbortSignal) {
  const result = await client.items.list({ q: query, limit: 20 }, { signal })
  if (result.error || !result.data) throw new Error('catalogue search failed')

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
            variant.options.map((option) => option.value).join(' / ') ||
            variant.name,
          sku: variant.sku,
          defaultAmount:
            variant.defaultSellingAmount ?? item.defaultSellingAmount ?? null,
          trackStock: item.trackStock,
          stockQuantity: variant.stockQuantity,
          allowOutOfStock: item.allowOutOfStock,
        })),
      }
    })
  )
}

function toEditDate(value: number | null | undefined) {
  return value ? new Date(value * 1_000).toISOString().slice(0, 10) : ''
}

function SelectRow({
  id,
  label,
  ariaLabel,
  placeholder = 'Select…',
  value,
  options,
  onChange,
  disabled,
}: {
  id: string
  label: string
  ariaLabel?: string
  placeholder?: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <FormRow htmlFor={id} label={label}>
      <NativeSelect
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={cn('w-full', FIELD_WIDTH)}
      >
        <NativeSelectOption value="">{placeholder}</NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </FormRow>
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
    <div className="mt-4 grid gap-6 text-sm sm:grid-cols-2">
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Recipient
        </p>
        {customer.organizationName ? (
          <p className="mt-1.5 font-medium text-balance">
            {customer.organizationName}
          </p>
        ) : null}
        {customer.contactName ? (
          <p
            className={cn(
              customer.organizationName ? 'mt-0.5' : 'mt-1.5 font-medium'
            )}
          >
            {customer.contactName}
          </p>
        ) : null}
        {customer.email || customer.phone ? (
          <p className="text-muted-foreground mt-1 text-xs">
            {[customer.email, customer.phone].filter(Boolean).join(' · ')}
          </p>
        ) : null}
      </div>
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Billing address
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
            No billing address on file.
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
