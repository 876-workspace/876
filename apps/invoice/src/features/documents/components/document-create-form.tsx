'use client'

import { Suspense, use, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  DocumentLineItemsEditor,
  formatMinorUnits,
  type DocumentLineDraft,
  type DocumentTotalsSnapshot,
} from '@876/billing-ui/document/document-line-items-editor'
import { Button } from '@876/ui/button'
import { AppError } from '@876/ui/app-error'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import { initialDocumentLine, toInvoiceLine } from '../document-create-model'

export type DocumentKind = 'invoice' | 'quote'

type CustomerOption = { id: string; name: string }

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

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function toUnixTimestamp(value: string): number | null {
  const timestamp = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isNaN(timestamp) ? null : Math.floor(timestamp / 1_000)
}

export function DocumentCreateForm({
  kind,
  customers,
}: {
  kind: DocumentKind
  customers: Promise<CustomerOption[]>
}) {
  const router = useRouter()
  const [customerId, setCustomerId] = useState('')
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
          <Suspense fallback={<LoadingCustomerSelect />}>
            <CustomerSelect
              customers={customers}
              value={customerId}
              onChange={setCustomerId}
              disabled={isPending}
            />
          </Suspense>
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
        <DocumentLineItemsEditor
          lines={lines}
          onChange={setLines}
          formatAmount={formatMinorUnits}
          onTotalsChange={setTotalsSnapshot}
        />
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
        <Button type="submit" variant="info" disabled={isPending}>
          {isPending ? 'Adding…' : config.submitLabel}
        </Button>
      </div>
    </form>
  )
}

function LoadingCustomerSelect() {
  return (
    <NativeSelect id="invoice-customer" disabled aria-label="Customer">
      <NativeSelectOption value="">Loading customers…</NativeSelectOption>
    </NativeSelect>
  )
}

function CustomerSelect({
  customers,
  value,
  onChange,
  disabled,
}: {
  customers: Promise<CustomerOption[]>
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  const options = use(customers)

  return (
    <NativeSelect
      id="invoice-customer"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled || options.length === 0}
    >
      <NativeSelectOption value="">
        {options.length === 0 ? 'No customers available' : 'Select customer'}
      </NativeSelectOption>
      {options.map((customer) => (
        <NativeSelectOption key={customer.id} value={customer.id}>
          {customer.name}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}
