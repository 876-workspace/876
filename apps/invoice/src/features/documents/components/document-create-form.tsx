'use client'

import {
  Suspense,
  use,
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import type { Customer } from '@876/billing'
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
import { Skeleton } from '@876/ui/skeleton'
import { Textarea } from '@876/ui/textarea'

import { client, type DocumentUpdateParams } from '@/lib/client'
import type { ClientResult } from '@/types/api'
import { initialDocumentLine } from '../document-create-model'

export type DocumentKind = 'invoice' | 'quote'

export interface InvoiceDocumentInitial {
  invoiceId: string
  status:
    | 'DRAFT'
    | 'OPEN'
    | 'SENT'
    | 'PARTIALLY_PAID'
    | 'OVERDUE'
    | 'PAID'
    | 'UNCOLLECTIBLE'
    | 'VOID'
  values: DocumentUpdateParams
  lines: DocumentLineDraft[]
}

type CustomerOption = Pick<
  Customer,
  | 'id'
  | 'name'
  | 'companyName'
  | 'email'
  | 'phone'
  | 'workPhone'
  | 'primaryContact'
>

type TaxRatesResult = ClientResult<DocumentTaxRateOption[]>

const documentConfig = {
  invoice: {
    title: 'Invoice',
    endpoint: '/api/invoices',
    returnUrl: '/invoices',
  },
  quote: {
    title: 'Quote',
    endpoint: '/api/quotes',
    returnUrl: '/quotes',
  },
} as const

const NO_ITEMS: Promise<DocumentItemOption[]> = Promise.resolve([])
const NO_TAX_RATES: Promise<TaxRatesResult> = Promise.resolve({
  data: [],
  error: null,
})
const EMPTY_ADJUSTMENTS: DocumentAdjustmentDraft = {
  discount: '',
  shipping: '',
  adjustment: '',
}
const FIELD_WIDTH = 'max-w-md'

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function futureInputValue(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function toUnixTimestamp(value: string): number | null {
  const timestamp = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isNaN(timestamp) ? null : Math.floor(timestamp / 1_000)
}

interface DocumentCreateFormProps {
  kind: DocumentKind
  items?: Promise<DocumentItemOption[]>
  taxRates?: Promise<TaxRatesResult>
  initialCustomer?: Promise<ClientResult<CustomerOption | null>>
  mode?: 'create' | 'edit'
  initialDocument?: InvoiceDocumentInitial
  onSubmit?: (params: DocumentUpdateParams) => Promise<ClientResult<unknown>>
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
  items = NO_ITEMS,
  taxRates = NO_TAX_RATES,
  initialCustomer,
}: DocumentCreateFormProps) {
  const router = useRouter()
  const [customerId, setCustomerId] = useState('')
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerOption | null>(null)
  const [isInitialCustomerLoading, setIsInitialCustomerLoading] = useState(
    Boolean(initialCustomer)
  )
  const [initialCustomerError, setInitialCustomerError] = useState<{
    code: string
    message: string
  } | null>(null)
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
    initialDocumentLine(),
  ])
  const [totalsSnapshot, setTotalsSnapshot] =
    useState<DocumentTotalsSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const config = documentConfig[kind]
  const parsedAdjustments =
    kind === 'invoice'
      ? parseDocumentAdjustments(adjustments, 2)
      : { discount: 0n, shipping: 0n, adjustment: 0n }

  useEffect(() => {
    if (!initialCustomer) return

    let active = true
    void initialCustomer.then(
      (result) => {
        if (!active) return
        if (result.data) {
          setCustomerId(result.data.id)
          setSelectedCustomer(result.data)
        }
        setInitialCustomerError(result.error)
        setIsInitialCustomerLoading(false)
      },
      () => {
        if (!active) return
        setInitialCustomerError({
          code: 'customer/prefill-failed',
          message: 'The selected customer could not be loaded.',
        })
        setIsInitialCustomerLoading(false)
      }
    )

    return () => {
      active = false
    }
  }, [initialCustomer])

  function handleIssueDateChange(value: string) {
    setIssueDate(value)
    if (kind === 'invoice') {
      const due = resolveTermDueDate(term, value)
      if (due) setEndDate(due)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

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

    const preparedLines = lines.map((line) => prepareDocumentLine(line, 2))
    if (preparedLines.length === 0 || preparedLines.some((line) => !line)) {
      setError(
        'Every line needs a description, positive quantity, and valid amounts.'
      )
      return
    }

    const issueAt = toUnixTimestamp(issueDate)
    if (issueAt === null) {
      setError(`Enter a valid ${config.title.toLowerCase()} date.`)
      return
    }

    const endAt = toUnixTimestamp(endDate)
    if (endAt === null || endAt < issueAt) {
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

    const common = {
      customerId,
      issueAt,
      notes: notes.trim() || null,
      terms: terms.trim() || null,
      lines: preparedLines.filter((line) => line !== null),
    }

    startTransition(async () => {
      const result = await client.documents.create(
        kind === 'quote'
          ? { ...common, expiresAt: endAt }
          : {
              ...common,
              dueAt: endAt,
              orderNumber: orderNumber.trim() || null,
              referenceNumber: referenceNumber.trim() || null,
              subject: subject.trim() || null,
              discountAmount: parsedAdjustments.discount.toString(),
              shippingAmount: parsedAdjustments.shipping.toString(),
              adjustmentAmount: parsedAdjustments.adjustment.toString(),
            },
        config.endpoint
      )
      if (result.error || !result.data) {
        setError(result.error?.message ?? `Failed to create ${config.title}.`)
        return
      }

      router.push(`${config.returnUrl}/${result.data.id}`)
      router.refresh()
    })
  }

  return (
    <form className="flex flex-col" onSubmit={submit}>
      <DocumentFormBand>
        <FormRow htmlFor="invoice-customer" label="Customer" required>
          <div className="max-w-2xl">
            <AsyncCombobox
              id="invoice-customer"
              ariaLabel="Customer"
              value={customerId}
              selectedLabel={
                selectedCustomer
                  ? (selectedCustomer.companyName ?? selectedCustomer.name)
                  : ''
              }
              onValueChange={(value, option) => {
                setCustomerId(value)
                setSelectedCustomer(
                  (option?.raw as CustomerOption | undefined) ?? null
                )
                setInitialCustomerError(null)
              }}
              onSearch={async (query, signal) => {
                const result = await client.customers.list(
                  { q: query, limit: 20 },
                  { signal }
                )
                if (result.error || !result.data)
                  throw new Error('search failed')

                return result.data.data.map((customer) => ({
                  value: customer.id,
                  label: customer.companyName ?? customer.name,
                  description: customer.email ?? undefined,
                  raw: customer,
                }))
              }}
              placeholder="Select or search a customer"
              emptyMessage="No customers found."
              disabled={isPending || isInitialCustomerLoading}
            />
            {initialCustomerError ? (
              <AppError
                error={initialCustomerError}
                variant="form"
                className="mt-3"
              />
            ) : null}
            {selectedCustomer ? (
              <CustomerSummary customer={selectedCustomer} />
            ) : null}
          </div>
        </FormRow>
      </DocumentFormBand>

      <DocumentFormSection>
        <FormRow label={`${config.title} #`}>
          <Input
            aria-label={`${config.title} number`}
            value="Assigned on save"
            readOnly
            tabIndex={-1}
            className={`${FIELD_WIDTH} text-muted-foreground`}
          />
        </FormRow>
        {kind === 'invoice' ? (
          <FormRow htmlFor="invoice-order-number" label="Order number">
            <Input
              id="invoice-order-number"
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              maxLength={120}
              disabled={isPending}
              className={FIELD_WIDTH}
            />
          </FormRow>
        ) : null}
        <FormRow
          htmlFor="invoice-issue-date"
          label={`${config.title} date`}
          required
        >
          <div className="grid gap-3 xl:grid-cols-[minmax(0,28rem)_minmax(0,30rem)] xl:items-center">
            <Input
              id="invoice-issue-date"
              type="date"
              value={issueDate}
              onChange={(event) => handleIssueDateChange(event.target.value)}
              disabled={isPending}
              required
            />
            {kind === 'invoice' ? (
              <DocumentPaymentTermsControl
                idPrefix="invoice"
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
          <FormRow htmlFor="quote-expiry-date" label="Expiry date">
            <Input
              id="quote-expiry-date"
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

      {kind === 'invoice' ? (
        <DocumentFormSection>
          <FormRow htmlFor="invoice-reference-number" label="Reference">
            <Input
              id="invoice-reference-number"
              value={referenceNumber}
              onChange={(event) => setReferenceNumber(event.target.value)}
              maxLength={120}
              disabled={isPending}
              className={FIELD_WIDTH}
            />
          </FormRow>
          <FormRow htmlFor="invoice-subject" label="Subject">
            <Textarea
              id="invoice-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={300}
              rows={2}
              placeholder="Let your customer know what this invoice is for"
              disabled={isPending}
              className="max-w-2xl"
            />
          </FormRow>
        </DocumentFormSection>
      ) : null}

      <DocumentFormSection className="space-y-6">
        <Suspense fallback={<LineItemsLoading />}>
          <InvoiceLineItems
            kind={kind}
            items={items}
            taxRates={taxRates}
            lines={lines}
            onChange={setLines}
            onTotalsChange={setTotalsSnapshot}
            discountAmount={parsedAdjustments?.discount}
            shippingAmount={parsedAdjustments?.shipping}
            adjustmentAmount={parsedAdjustments?.adjustment}
          />
        </Suspense>

        <DocumentFormSummaryGrid>
          <DocumentNotesField
            id="invoice-notes"
            value={notes}
            onChange={setNotes}
            disabled={isPending}
          />
          <DocumentTotalsSummary
            snapshot={totalsSnapshot}
            formatAmount={formatMinorUnits}
            idPrefix={`invoice-${kind}`}
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
        id="invoice-terms"
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
        totalAmount={documentFooterTotal(totalsSnapshot, formatMinorUnits)}
        totalQuantity={documentTotalQuantity(lines)}
      >
        <Button
          type="submit"
          variant="info"
          disabled={isPending || isInitialCustomerLoading}
        >
          {isPending ? 'Saving…' : 'Save as draft'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(config.returnUrl)}
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
  taxRates = NO_TAX_RATES,
  onSubmit,
}: {
  initialDocument: InvoiceDocumentInitial
  taxRates?: Promise<TaxRatesResult>
  onSubmit?: (params: DocumentUpdateParams) => Promise<ClientResult<unknown>>
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [issueDate, setIssueDate] = useState(
    toDateInput(initialDocument.values.issueAt)
  )
  const [term, setTerm] = useState<DocumentPaymentTerm>('custom')
  const [dueDate, setDueDate] = useState(
    toDateInput(initialDocument.values.dueAt)
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const dueAt = toUnixTimestamp(dueDate)
    const issueAt = toUnixTimestamp(issueDate)
    if (
      (dueDate && dueAt === null) ||
      (!restricted && issueDate && issueAt === null)
    ) {
      setError('Enter valid invoice dates.')
      return
    }
    const preparedLines = restricted
      ? []
      : lines.map((line) => prepareDocumentLine(line, 2))
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
    const payload: DocumentUpdateParams = {
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
        : await client.documents.update(initialDocument.invoiceId, payload)
      if (result.error) {
        setError(result.error.message)
        return
      }
      router.push(detailHref)
      router.refresh()
    })
  }

  return (
    <form className="flex flex-col" onSubmit={submit}>
      <DocumentFormSection className="pt-0">
        {!restricted ? (
          <FormRow htmlFor="invoice-edit-order-number" label="Order number">
            <Input
              id="invoice-edit-order-number"
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              maxLength={120}
              disabled={isPending}
              className={FIELD_WIDTH}
            />
          </FormRow>
        ) : null}
        <FormRow
          htmlFor={restricted ? 'invoice-edit-due-date' : 'invoice-edit-date'}
          label={restricted ? 'Due date' : 'Invoice date'}
        >
          <div className="grid gap-3 xl:grid-cols-[minmax(0,28rem)_minmax(0,30rem)] xl:items-center">
            {!restricted ? (
              <Input
                id="invoice-edit-date"
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
              idPrefix="invoice-edit"
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
        <FormRow htmlFor="invoice-edit-reference" label="Reference">
          <Input
            id="invoice-edit-reference"
            value={referenceNumber}
            onChange={(event) => setReferenceNumber(event.target.value)}
            maxLength={120}
            disabled={isPending}
            className={FIELD_WIDTH}
          />
        </FormRow>
        {!restricted ? (
          <FormRow htmlFor="invoice-edit-subject" label="Subject">
            <Textarea
              id="invoice-edit-subject"
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
          <Suspense fallback={<LineItemsLoading />}>
            <InvoiceLineItems
              kind="invoice"
              items={NO_ITEMS}
              taxRates={taxRates}
              lines={lines}
              onChange={setLines}
              onTotalsChange={setTotals}
            />
          </Suspense>
        ) : null}
        <DocumentFormSummaryGrid>
          <DocumentNotesField
            id="invoice-edit-notes"
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
        id="invoice-edit-terms"
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

function toDateInput(value: number | null | undefined) {
  return value ? new Date(value * 1_000).toISOString().slice(0, 10) : ''
}

function CustomerSummary({ customer }: { customer: CustomerOption }) {
  const contactName = customer.primaryContact
    ? [customer.primaryContact.firstName, customer.primaryContact.lastName]
        .filter(Boolean)
        .join(' ')
    : ''
  const reach = [
    customer.primaryContact?.email ?? customer.email,
    customer.primaryContact?.mobilePhone ??
      customer.primaryContact?.workPhone ??
      customer.phone ??
      customer.workPhone,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="mt-4 text-sm">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Recipient
      </p>
      <p className="mt-1.5 font-medium">
        {customer.companyName ?? customer.name}
      </p>
      {contactName ? <p className="mt-0.5">{contactName}</p> : null}
      {reach ? (
        <p className="text-muted-foreground mt-1 text-xs">{reach}</p>
      ) : null}
    </div>
  )
}

function InvoiceLineItems({
  kind,
  items,
  taxRates,
  lines,
  onChange,
  onTotalsChange,
  discountAmount,
  shippingAmount,
  adjustmentAmount,
}: {
  kind: DocumentKind
  items: Promise<DocumentItemOption[]>
  taxRates: Promise<TaxRatesResult>
  lines: DocumentLineDraft[]
  onChange: (lines: DocumentLineDraft[]) => void
  onTotalsChange: (snapshot: DocumentTotalsSnapshot) => void
  discountAmount?: bigint
  shippingAmount?: bigint
  adjustmentAmount?: bigint
}) {
  const catalogue = use(items)
  const rates = use(taxRates)

  return (
    <div className="space-y-3">
      {rates.error ? (
        <AppError
          title="Tax rates could not be loaded"
          error={rates.error}
          variant="banner"
        />
      ) : null}
      <DocumentLineItemsEditor
        title="Item table"
        bleed
        items={catalogue}
        taxRates={rates.data && rates.data.length > 0 ? rates.data : undefined}
        enforceItemStock={kind === 'invoice'}
        allowPercentageDiscount
        onSearchItems={async (query, signal) => {
          const result = await client.items.list(
            { q: query, limit: 20 },
            { signal }
          )
          if (result.error || !result.data)
            throw new Error('catalogue search failed')

          return await Promise.all(
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
        lines={lines}
        onChange={onChange}
        formatAmount={formatMinorUnits}
        discountAmount={discountAmount}
        shippingAmount={shippingAmount}
        adjustmentAmount={adjustmentAmount}
        showTotals={false}
        onTotalsChange={onTotalsChange}
      />
    </div>
  )
}

function LineItemsLoading() {
  return <Skeleton className="h-40 w-full rounded-lg" />
}
