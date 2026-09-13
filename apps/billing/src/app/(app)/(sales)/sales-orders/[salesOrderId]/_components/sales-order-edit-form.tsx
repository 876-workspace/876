'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DocumentLineItemsEditor,
  formatMinorUnits,
  type DocumentLineDraft,
  type DocumentTotalsSnapshot,
} from '@876/billing-ui/document/document-line-items-editor'
import { prepareDocumentLine } from '@876/billing-ui/document/document-line-payload'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { Textarea } from '@876/ui/textarea'
import { AppError } from '@876/ui/app-error'

import { client } from '@/lib/client'

type Props = {
  salesOrderId: string
  currency: string
  referenceNumber: string | null
  notes: string | null
  terms: string | null
  lines: DocumentLineDraft[]
}

export function SalesOrderEditForm({
  salesOrderId,
  currency,
  referenceNumber: initialReferenceNumber,
  notes: initialNotes,
  terms: initialTerms,
  lines: initialLines,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null
  )
  const [referenceNumber, setReferenceNumber] = useState(
    initialReferenceNumber ?? ''
  )
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [terms, setTerms] = useState(initialTerms ?? '')
  const [lines, setLines] = useState(initialLines)
  const [totals, setTotals] = useState<DocumentTotalsSnapshot | null>(null)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const preparedLines = lines.map((line) =>
      prepareDocumentLine(line, 2, false)
    )
    if (
      totals?.status !== 'ready' ||
      preparedLines.some((line) => line === null)
    ) {
      setError({
        code: 'billing/sales-order-invalid-state',
        message:
          'Every line needs a description, positive quantity, and valid amounts.',
      })
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await client.salesOrders.update(salesOrderId, {
        referenceNumber: referenceNumber.trim() || null,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        lines: preparedLines.filter((line) => line !== null),
      })
      if (result.error) {
        setError({
          code: result.error.code ?? 'billing/sales-order-invalid-state',
          message: result.error.message,
        })
        return
      }
      router.push(`/sales-orders/${salesOrderId}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-6xl space-y-6">
      <section className="876-card grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <div className="space-y-2">
          <Label htmlFor="sales-order-reference">Reference</Label>
          <Input
            id="sales-order-reference"
            value={referenceNumber}
            onChange={(event) => setReferenceNumber(event.target.value)}
            disabled={isPending}
          />
        </div>
      </section>
      <section className="876-card space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold">Line items</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Edit the products and services included in this sales order.
          </p>
        </div>
        <DocumentLineItemsEditor
          lines={lines}
          onChange={setLines}
          onTotalsChange={setTotals}
          formatAmount={(amount) => `${currency} ${formatMinorUnits(amount)}`}
        />
      </section>
      <section className="876-card grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <div className="space-y-2">
          <Label htmlFor="sales-order-notes">Customer note</Label>
          <Textarea
            id="sales-order-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sales-order-terms">Terms and conditions</Label>
          <Textarea
            id="sales-order-terms"
            value={terms}
            onChange={(event) => setTerms(event.target.value)}
            disabled={isPending}
          />
        </div>
      </section>
      {error ? (
        <AppError
          title="Sales Order could not be updated"
          error={error}
          variant="banner"
        />
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => router.push(`/sales-orders/${salesOrderId}`)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save sales order'}
        </Button>
      </div>
    </form>
  )
}
