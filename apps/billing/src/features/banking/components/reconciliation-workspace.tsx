'use client'

import { useMemo, useState, useTransition } from 'react'

import type { BankReconciliation, BankTransaction } from '@876/billing'
import { parseDecimalToMinorUnits } from '@876/core/money'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'

import { client } from '@/lib/client'
import { formatMoney } from '@/lib/format'

function startOfDay(value: string): number | null {
  if (!value) return null
  const milliseconds = new Date(`${value}T00:00:00`).getTime()
  return Number.isFinite(milliseconds) ? Math.floor(milliseconds / 1000) : null
}

function endOfDay(value: string): number | null {
  if (!value) return null
  const milliseconds = new Date(`${value}T23:59:59`).getTime()
  return Number.isFinite(milliseconds) ? Math.floor(milliseconds / 1000) : null
}

export function ReconciliationWorkspace({
  accountId,
  currency,
  decimalPlaces,
  transactions,
  initialReconciliations,
  initialError = null,
}: {
  accountId: string
  currency: string
  decimalPlaces: number
  transactions: BankTransaction[]
  initialReconciliations: BankReconciliation[]
  initialError?: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(initialError)
  const [reconciliations, setReconciliations] =
    useState<BankReconciliation[]>(initialReconciliations)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')
  const [closingBalance, setClosingBalance] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const completedTransactionIds = useMemo(
    () =>
      new Set(
        reconciliations
          .filter((item) => item.status === 'completed')
          .flatMap((item) => item.bankTransactionIds)
      ),
    [reconciliations]
  )

  const periodStart = startOfDay(startDate)
  const periodEnd = endOfDay(endDate)
  const eligibleTransactions = useMemo(() => {
    if (periodStart === null || periodEnd === null) return []
    return transactions.filter(
      (transaction) =>
        transaction.date >= periodStart &&
        transaction.date <= periodEnd &&
        !completedTransactionIds.has(transaction.id)
    )
  }, [completedTransactionIds, periodEnd, periodStart, transactions])

  async function reload() {
    const result = await client.bankReconciliations.list(accountId)
    if (result.error || !result.data) {
      setError(result.error?.message ?? 'Could not refresh reconciliations.')
      return
    }
    setReconciliations(result.data.data)
  }

  function toggleTransaction(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function createDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const startAt = startOfDay(startDate)
    const endAt = endOfDay(endDate)
    const opening = parseDecimalToMinorUnits(openingBalance, decimalPlaces)
    const closing = parseDecimalToMinorUnits(closingBalance, decimalPlaces)

    if (startAt === null || endAt === null || startAt > endAt) {
      setError('Choose a valid statement period.')
      return
    }
    if (opening === null || closing === null) {
      setError(
        `Enter valid opening and closing balances with at most ${decimalPlaces} decimal places.`
      )
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await client.bankReconciliations.create(accountId, {
        startAt,
        endAt,
        openingBalance: opening.toString(),
        closingBalance: closing.toString(),
        bankTransactionIds: [...selectedIds],
      })
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Could not create reconciliation.')
        return
      }
      const created = result.data
      setReconciliations((current) => [created, ...current])
      setSelectedIds(new Set())
      setOpeningBalance('')
      setClosingBalance('')
    })
  }

  function complete(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await client.bankReconciliations.complete(id)
      if (result.error) {
        setError(result.error.message)
        return
      }
      await reload()
    })
  }

  function reopen(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await client.bankReconciliations.reopen(id)
      if (result.error) {
        setError(result.error.message)
        return
      }
      await reload()
    })
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createDraft} className="876-card space-y-5 p-5">
        <div>
          <h2 className="font-semibold">Reconcile a statement period</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Enter the bank statement balances and select the booked cash movements
            that cleared during the same period. 876 calculates the cleared
            balance and difference on the server.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Statement start" htmlFor="reconcile-start">
            <Input
              id="reconcile-start"
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value)
                setSelectedIds(new Set())
              }}
              required
            />
          </Field>
          <Field label="Statement end" htmlFor="reconcile-end">
            <Input
              id="reconcile-end"
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value)
                setSelectedIds(new Set())
              }}
              required
            />
          </Field>
          <Field label={`Opening balance (${currency})`} htmlFor="reconcile-opening">
            <Input
              id="reconcile-opening"
              inputMode="decimal"
              value={openingBalance}
              onChange={(event) => setOpeningBalance(event.target.value)}
              placeholder="0.00"
              required
            />
          </Field>
          <Field label={`Closing balance (${currency})`} htmlFor="reconcile-closing">
            <Input
              id="reconcile-closing"
              inputMode="decimal"
              value={closingBalance}
              onChange={(event) => setClosingBalance(event.target.value)}
              placeholder="0.00"
              required
            />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <Label>Cleared booked transactions</Label>
            <span className="text-muted-foreground text-xs">
              {selectedIds.size} selected
            </span>
          </div>
          {periodStart === null || periodEnd === null ? (
            <p className="text-muted-foreground rounded-lg border px-4 py-5 text-sm">
              Choose a statement period to see eligible transactions.
            </p>
          ) : eligibleTransactions.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border px-4 py-5 text-sm">
              No unreconciled booked transactions fall inside this period.
            </p>
          ) : (
            <div className="divide-border max-h-80 divide-y overflow-y-auto rounded-lg border">
              {eligibleTransactions.map((transaction) => (
                <label
                  key={transaction.id}
                  className="hover:bg-muted/30 flex cursor-pointer items-center gap-3 px-4 py-3"
                >
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={selectedIds.has(transaction.id)}
                    onChange={() => toggleTransaction(transaction.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {transaction.description ??
                        transaction.reference ??
                        (transaction.type === 'CREDIT' ? 'Credit' : 'Debit')}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {new Date(transaction.date * 1000).toLocaleDateString()}
                      {transaction.reference ? ` · ${transaction.reference}` : ''}
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {transaction.type === 'DEBIT' ? '-' : '+'}
                    {formatMoney(transaction.amount, currency)}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create reconciliation draft'}
        </Button>
      </form>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <section className="876-card overflow-hidden">
        <div className="border-border border-b px-5 py-4">
          <h2 className="font-semibold">Reconciliation history</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            A draft can complete only when the difference is zero. Completed
            periods remain historical evidence and must be explicitly reopened.
          </p>
        </div>
        {reconciliations.length === 0 ? (
          <p className="text-muted-foreground px-5 py-10 text-center text-sm">
            No reconciliations yet.
          </p>
        ) : (
          <div className="divide-border divide-y">
            {reconciliations.map((item) => (
              <div
                key={item.id}
                className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {new Date(item.startAt * 1000).toLocaleDateString()} –{' '}
                      {new Date(item.endAt * 1000).toLocaleDateString()}
                    </p>
                    <Badge
                      variant={item.status === 'completed' ? 'success' : 'outline'}
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span>
                      Opening {formatMoney(item.openingBalance, currency)}
                    </span>
                    <span>
                      Cleared {formatMoney(item.clearedBalance, currency)}
                    </span>
                    <span>
                      Closing {formatMoney(item.closingBalance, currency)}
                    </span>
                    <span>
                      Difference {formatMoney(item.difference, currency)}
                    </span>
                    <span>{item.bankTransactionIds.length} transactions</span>
                  </div>
                </div>
                <div className="flex gap-2 lg:justify-end">
                  {item.status !== 'completed' ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending || item.difference !== '0'}
                      onClick={() => complete(item.id)}
                    >
                      Complete
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => reopen(item.id)}
                    >
                      Reopen
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
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
