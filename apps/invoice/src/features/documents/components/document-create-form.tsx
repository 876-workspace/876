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
  type DocumentTotalsSnapshot,
} from '@876/billing-ui/document/document-line-items-editor'
import { Button } from '@876/ui/button'
import { AppError } from '@876/ui/app-error'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { AsyncCombobox } from '@876/ui/async-combobox'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import type { ClientResult } from '@/types/api'
import { initialDocumentLine, toInvoiceLine } from '../document-create-model'

export type DocumentKind = 'invoice' | 'quote'

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

const documentConfig = {
  invoice: {
    title: 'Invoice',
    submitLabel: 'Add invoice',
    endpoint: '/api/invoices',
    returnUrl: '/invoices',
  },
  quote: {
    title: 'Quote',
    submitLabel: 'Add quote',
    endpoint: '/api/quotes',
    returnUrl: '/quotes',
  },
} as const

const NO_ITEMS: Promise<DocumentItemOption[]> = Promise.resolve([])

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function toUnixTimestamp(value: string): number | null {
  const timestamp = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isNaN(timestamp) ? null : Math.floor(timestamp / 1_000)
}

export function DocumentCreateForm({
  kind,
  items = NO_ITEMS,
  initialCustomer,
}: {
  kind: DocumentKind
  items?: Promise<DocumentItemOption[]>
  initialCustomer?: Promise<ClientResult<CustomerOption | null>>
}) {
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
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [lines, setLines] = useState<DocumentLineDraft[]>([
    initialDocumentLine(),
  ])
  const [totalsSnapshot, setTotalsSnapshot] =
    useState<DocumentTotalsSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const config = documentConfig[kind]

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

    const preparedLines = lines.map(toInvoiceLine)
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

    startTransition(async () => {
      const result = await client.documents.create(
        {
          customerId,
          issueAt,
          notes: notes.trim() || null,
          terms: terms.trim() || null,
          lines: preparedLines.filter((line) => line !== null),
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
    <form className="max-w-5xl space-y-6" onSubmit={submit}>
      <section className="876-card grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <div className="space-y-2">
          <Label htmlFor="invoice-customer">Customer</Label>
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
              if (result.error || !result.data) throw new Error('search failed')

              return result.data.data.map((customer) => ({
                value: customer.id,
                label: customer.companyName ?? customer.name,
                description: customer.email ?? undefined,
                raw: customer,
              }))
            }}
            placeholder="Search customers…"
            emptyMessage="No customers found."
            disabled={isPending || isInitialCustomerLoading}
          />
          {initialCustomerError ? (
            <AppError error={initialCustomerError} variant="form" />
          ) : null}
          {selectedCustomer ? (
            <div className="border-border mt-4 border-t pt-4 text-sm">
              <p className="font-semibold">
                {selectedCustomer.companyName ?? selectedCustomer.name}
              </p>
              {selectedCustomer.primaryContact ? (
                <p className="text-muted-foreground mt-1">
                  {[
                    selectedCustomer.primaryContact.firstName,
                    selectedCustomer.primaryContact.lastName,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                </p>
              ) : null}
              {[
                selectedCustomer.primaryContact?.email ??
                  selectedCustomer.email,
                selectedCustomer.primaryContact?.mobilePhone ??
                  selectedCustomer.primaryContact?.workPhone ??
                  selectedCustomer.phone ??
                  selectedCustomer.workPhone,
              ]
                .filter(Boolean)
                .join(' · ') ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  {[
                    selectedCustomer.primaryContact?.email ??
                      selectedCustomer.email,
                    selectedCustomer.primaryContact?.mobilePhone ??
                      selectedCustomer.primaryContact?.workPhone ??
                      selectedCustomer.phone ??
                      selectedCustomer.workPhone,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoice-issue-date">{config.title} date</Label>
          <Input
            id="invoice-issue-date"
            type="date"
            value={issueDate}
            onChange={(event) => setIssueDate(event.target.value)}
            disabled={isPending}
            required
          />
        </div>
      </section>

      <section className="876-card space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold">Line items</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Add every product or service included in this{' '}
            {config.title.toLowerCase()}.
          </p>
        </div>
        <Suspense fallback={<LineItemsLoading />}>
          <InvoiceLineItems
            kind={kind}
            items={items}
            lines={lines}
            onChange={setLines}
            onTotalsChange={setTotalsSnapshot}
          />
        </Suspense>
      </section>

      <section className="876-card grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <div className="space-y-2">
          <Label htmlFor="invoice-notes">Customer note</Label>
          <Textarea
            id="invoice-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoice-terms">Terms and conditions</Label>
          <Textarea
            id="invoice-terms"
            value={terms}
            onChange={(event) => setTerms(event.target.value)}
            disabled={isPending}
          />
        </div>
      </section>

      {error ? (
        <AppError
          error={{ code: `${kind}/create-failed`, message: error }}
          variant="form"
        />
      ) : null}

      <div className="flex justify-end gap-2 pb-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(config.returnUrl)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="info"
          disabled={isPending || isInitialCustomerLoading}
        >
          {isPending ? 'Adding…' : config.submitLabel}
        </Button>
      </div>
    </form>
  )
}

function InvoiceLineItems({
  kind,
  items,
  lines,
  onChange,
  onTotalsChange,
}: {
  kind: DocumentKind
  items: Promise<DocumentItemOption[]>
  lines: DocumentLineDraft[]
  onChange: (lines: DocumentLineDraft[]) => void
  onTotalsChange: (snapshot: DocumentTotalsSnapshot) => void
}) {
  const catalogue = use(items)

  return (
    <DocumentLineItemsEditor
      items={catalogue}
      enforceItemStock={kind === 'invoice'}
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
      onTotalsChange={onTotalsChange}
    />
  )
}

function LineItemsLoading() {
  return <div className="bg-muted h-24 animate-pulse rounded-md" />
}
