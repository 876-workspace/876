'use client'

import type { Baseline, BaselineComparison } from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { formatDate } from '@876/projects-ui/format-date'
import { baselinesClient } from '@/lib/client'

type Props = {
  projectId: string
  baselines: readonly Baseline[]
  selectedBaselineId: string | null
  comparison: BaselineComparison | null
  canEdit: boolean
}

/** Variance in whole days against the captured baseline; negative is earlier. */
export function formatVarianceDays(minutes: number | null): string {
  if (minutes === null) return '—'
  const days = Math.round(minutes / 1440)
  if (days === 0) return '0 d'
  return `${days > 0 ? '+' : '-'}${Math.abs(days)} d`
}

export function GanttBaselines({
  projectId,
  baselines,
  selectedBaselineId,
  comparison,
  canEdit,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [name, setName] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function capture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || capturing) return

    setCapturing(true)
    setError(null)
    const result = await baselinesClient.create(projectId, { name: trimmed })
    setCapturing(false)

    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/baseline-capture-failed',
          message: 'The baseline could not be captured.',
        }
      )
      return
    }

    setName('')
    router.replace(
      `${pathname}?baselineId=${encodeURIComponent(result.data.id)}`
    )
  }

  async function remove(baselineId: string) {
    setDeletingId(baselineId)
    setError(null)
    const result = await baselinesClient.delete(projectId, baselineId)
    setDeletingId(null)

    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/baseline-delete-failed',
          message: 'The baseline could not be deleted.',
        }
      )
      return
    }

    if (baselineId === selectedBaselineId) router.replace(pathname)
    else router.refresh()
  }

  return (
    <section className="876-card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="876-page-title">Baselines</h2>
        {canEdit ? (
          <form onSubmit={capture} className="flex items-center gap-2">
            <label className="sr-only" htmlFor="baseline-name">
              Baseline name
            </label>
            <input
              id="baseline-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Baseline name"
              maxLength={100}
              className="bg-background border-border h-8 rounded-md border px-2 text-sm"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={capturing}
            >
              Capture baseline
            </Button>
          </form>
        ) : null}
      </div>

      {error ? (
        <AppError
          title="The baseline change was not saved"
          error={error}
          variant="banner"
        />
      ) : null}

      {baselines.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No baselines captured yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {baselines.map((baseline) => (
            <li
              key={baseline.id}
              className="border-border flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{baseline.name}</p>
                <p className="text-muted-foreground text-xs">
                  Captured {formatDate(baseline.capturedAt)} ·{' '}
                  {baseline.itemCount} work items
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`${pathname}?baselineId=${encodeURIComponent(baseline.id)}`}
                  aria-current={
                    baseline.id === selectedBaselineId ? 'true' : undefined
                  }
                  className="text-sm hover:underline"
                >
                  Compare {baseline.name}
                </Link>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={deletingId === baseline.id}
                    aria-label={`Delete ${baseline.name}`}
                    onClick={() => remove(baseline.id)}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {comparison ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Variance against baseline</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work item</TableHead>
                <TableHead>Baseline start</TableHead>
                <TableHead>Baseline finish</TableHead>
                <TableHead>Current start</TableHead>
                <TableHead>Current finish</TableHead>
                <TableHead>Start variance</TableHead>
                <TableHead>Finish variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.items.map((item) => (
                <TableRow key={item.issueId}>
                  <TableCell>{item.identifier}</TableCell>
                  <TableCell>{formatDate(item.baselineStart)}</TableCell>
                  <TableCell>{formatDate(item.baselineFinish)}</TableCell>
                  <TableCell>{formatDate(item.currentStart)}</TableCell>
                  <TableCell>{formatDate(item.currentFinish)}</TableCell>
                  <TableCell>
                    {formatVarianceDays(item.startVarianceMinutes)}
                  </TableCell>
                  <TableCell>
                    {formatVarianceDays(item.finishVarianceMinutes)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {comparison.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              This baseline has nothing to compare yet.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
