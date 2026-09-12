'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'

import type {
  BankMatchCandidate,
  BankStatementLine,
  StatementLineStatus,
} from '@876/billing'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'
import { formatMoney } from '@/lib/format'

type Filter = 'all' | StatementLineStatus

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All statement lines' },
  { value: 'uncategorized', label: 'Uncategorized' },
  { value: 'recognized', label: 'Recognized' },
  { value: 'matched', label: 'Matched' },
  { value: 'categorized', label: 'Categorized' },
  { value: 'excluded', label: 'Excluded' },
]

export function StatementWorkspace({
  accountId,
  currency,
  canManage,
}: {
  accountId: string
  currency: string
  canManage: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [lines, setLines] = useState<BankStatementLine[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState<string | null>(null)
  const [candidateLineId, setCandidateLineId] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<BankMatchCandidate[]>([])

  const load = useCallback(async () => {
    const result = await client.bankStatementLines.list(accountId)
    if (result.error || !result.data) {
      setError(result.error?.message ?? 'Could not load statement transactions.')
      return
    }
    setLines(result.data.data)
    setError(null)
  }, [accountId])

  useEffect(() => {
    void load()
  }, [load])

  const visible = useMemo(
    () =>
      filter === 'all' ? lines : lines.filter((line) => line.status === filter),
    [filter, lines]
  )

  function mutate(operation: () => Promise<{ error: { message: string } | null }>) {
    setError(null)
    startTransition(async () => {
      const result = await operation()
      if (result.error) {
        setError(result.error.message)
        return
      }
      setCandidateLineId(null)
      setCandidates([])
      await load()
    })
  }

  function findMatches(lineId: string) {
    setError(null)
    startTransition(async () => {
      const result = await client.bankStatementLines.matches(lineId)
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Could not search for matches.')
        return
      }
      setCandidateLineId(lineId)
      setCandidates(result.data.data)
    })
  }

  return (
    <section className="876-card overflow-hidden">
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="font-semibold">Statement transactions</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            External bank evidence stays separate from recorded cash until you
            match or categorize it.
          </p>
        </div>
        <NativeSelect
          value={filter}
          onChange={(event) => setFilter(event.target.value as Filter)}
          className="w-auto min-w-44"
        >
          {FILTERS.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive border-b px-5 py-3 text-sm">
          {error}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="text-muted-foreground px-5 py-10 text-center text-sm">
          {lines.length === 0
            ? 'No statement transactions imported yet.'
            : 'No statement transactions match this filter.'}
        </p>
      ) : (
        <div className="divide-border divide-y">
          {visible.map((line) => {
            const showingCandidates = candidateLineId === line.id
            return (
              <div key={line.id} className="px-5 py-4">
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">
                        {line.payee ?? line.description ?? 'Bank transaction'}
                      </p>
                      <StatusBadge status={line.status} />
                      {line.duplicateOfId ? (
                        <Badge variant="secondary">Possible duplicate</Badge>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {new Date(line.postedAt * 1000).toLocaleDateString()}
                      {line.reference ? ` · ${line.reference}` : ''}
                    </p>
                    {line.description && line.payee ? (
                      <p className="text-muted-foreground mt-2 text-sm">
                        {line.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold tabular-nums ${
                        line.type === 'debit' ? 'text-destructive' : ''
                      }`}
                    >
                      {line.type === 'debit' ? '-' : '+'}
                      {formatMoney(line.amount, currency)}
                    </p>
                    {line.runningBalance ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        Balance {formatMoney(line.runningBalance, currency)}
                      </p>
                    ) : null}
                  </div>
                </div>

                {canManage ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {line.status === 'uncategorized' || line.status === 'recognized' ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => findMatches(line.id)}
                        >
                          Find match
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() =>
                            mutate(() =>
                              client.bankStatementLines.categorize(line.id, {
                                action:
                                  line.type === 'credit'
                                    ? 'manual-deposit'
                                    : 'manual-withdrawal',
                              })
                            )
                          }
                        >
                          Record as {line.type === 'credit' ? 'deposit' : 'withdrawal'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() =>
                            mutate(() => client.bankStatementLines.exclude(line.id))
                          }
                        >
                          Exclude
                        </Button>
                      </>
                    ) : null}
                    {line.status === 'matched' || line.status === 'categorized' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          mutate(() => client.bankStatementLines.unmatch(line.id))
                        }
                      >
                        Unmatch
                      </Button>
                    ) : null}
                    {line.status === 'excluded' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          mutate(() => client.bankStatementLines.restore(line.id))
                        }
                      >
                        Restore
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {showingCandidates ? (
                  <div className="bg-muted/30 mt-4 rounded-lg border p-3">
                    <p className="text-sm font-medium">Possible recorded matches</p>
                    {candidates.length === 0 ? (
                      <p className="text-muted-foreground mt-2 text-sm">
                        No suitable recorded cash movements were found.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {candidates.slice(0, 5).map((candidate) => (
                          <div
                            key={candidate.bankTransactionId}
                            className="bg-background flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {candidate.description ??
                                  candidate.reference ??
                                  'Recorded bank transaction'}
                              </p>
                              <p className="text-muted-foreground mt-0.5 text-xs">
                                {new Date(candidate.date * 1000).toLocaleDateString()} ·{' '}
                                {candidate.confidence} match · score {candidate.score}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold tabular-nums">
                                {formatMoney(candidate.availableAmount, currency)}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                disabled={isPending}
                                onClick={() =>
                                  mutate(() =>
                                    client.bankStatementLines.match(line.id, {
                                      items: [
                                        {
                                          bankTransactionId:
                                            candidate.bankTransactionId,
                                          amount: line.amount,
                                        },
                                      ],
                                    })
                                  )
                                }
                              >
                                Match
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function StatusBadge({ status }: { status: StatementLineStatus }) {
  const variant =
    status === 'matched' || status === 'categorized'
      ? 'success'
      : status === 'excluded'
        ? 'secondary'
        : 'outline'
  return <Badge variant={variant}>{status.replace('-', ' ')}</Badge>
}
