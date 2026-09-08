'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'

import { client } from '@/lib/client'
import {
  formatMinorAmountInput,
  minorAmountInputStep,
  parseMinorAmountInput,
} from '@/lib/format'

interface InvoiceOption {
  id: string
  number: string
  amountDue: string
}

export function CreditNoteApplyForm({
  creditNoteId,
  currency,
  decimalPlaces,
  balanceAmount,
  invoices,
}: {
  creditNoteId: string
  currency: string
  decimalPlaces: number
  balanceAmount: string
  invoices: InvoiceOption[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [allocations, setAllocations] = useState<Record<string, string>>({})

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const parsed = invoices.flatMap((invoice) => {
      const value = parseMinorAmountInput(
        allocations[invoice.id] ?? '',
        decimalPlaces,
        true
      )
      if (!value || BigInt(value) === 0n) return []
      return [
        { invoiceId: invoice.id, amount: value, amountDue: invoice.amountDue },
      ]
    })

    if (parsed.length === 0) {
      setError('Enter an amount for at least one invoice.')
      return
    }

    for (const allocation of parsed) {
      if (BigInt(allocation.amount) > BigInt(allocation.amountDue)) {
        setError('An allocation cannot exceed the invoice amount due.')
        return
      }
    }

    const total = parsed.reduce(
      (sum, allocation) => sum + BigInt(allocation.amount),
      0n
    )
    if (total > BigInt(balanceAmount)) {
      setError('Allocations cannot exceed the remaining credit-note balance.')
      return
    }

    startTransition(async () => {
      const result = await client.creditNotes.apply(creditNoteId, {
        allocations: parsed.map(({ invoiceId, amount }) => ({
          invoiceId,
          amount,
        })),
      })
      if (result.error) {
        setError(result.error.message)
        return
      }
      router.push(`/credit-notes/${creditNoteId}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="876-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div>
            <p className="876-eyebrow">Available credit</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatMinorAmountInput(balanceAmount, decimalPlaces)} {currency}
            </p>
          </div>
          <p className="text-muted-foreground max-w-md text-sm">
            Apply existing credit to this customer&apos;s open invoices. This
            does not create or move cash.
          </p>
        </div>

        {invoices.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            This customer has no eligible invoices in {currency}.
          </p>
        ) : (
          <div className="divide-y">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="grid gap-3 py-4 sm:grid-cols-[1fr_12rem] sm:items-center"
              >
                <div>
                  <p className="font-medium">{invoice.number}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {formatMinorAmountInput(invoice.amountDue, decimalPlaces)}{' '}
                    {currency} due
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`credit-allocation-${invoice.id}`}>
                    Apply
                  </Label>
                  <Input
                    id={`credit-allocation-${invoice.id}`}
                    type="number"
                    min="0"
                    max={formatMinorAmountInput(
                      invoice.amountDue,
                      decimalPlaces
                    )}
                    step={minorAmountInputStep(decimalPlaces)}
                    value={allocations[invoice.id] ?? ''}
                    onChange={(event) =>
                      setAllocations((current) => ({
                        ...current,
                        [invoice.id]: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || invoices.length === 0}>
          {isPending ? 'Applying credit...' : 'Apply credit'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => router.push(`/credit-notes/${creditNoteId}`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
