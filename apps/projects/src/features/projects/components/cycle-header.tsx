'use client'

import type { Cycle } from '@876/projects/contracts'
import { Button } from '@876/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { cyclesClient } from '@/lib/client/cycles'

function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

export function CycleHeader({
  cycle,
  projectName,
  canEdit,
  onError,
}: {
  cycle: Cycle
  projectName: string | null
  canEdit: boolean
  onError: (error: { code: string; message: string }) => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function removeCycle() {
    if (pending) return
    setPending(true)
    const result = await cyclesClient.delete(cycle.id)
    setPending(false)
    if (result.error) {
      onError(result.error)
      return
    }
    router.push('/cycles')
  }

  return (
    <div className="876-card space-y-3 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="876-page-title">{cycle.name}</h1>
        <span className="876-badge">{cycle.status}</span>
        {canEdit ? (
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/cycles/${encodeURIComponent(cycle.id)}/edit`)
              }
            >
              Edit
            </Button>
            <Button variant="outline" onClick={removeCycle} disabled={pending}>
              Delete
            </Button>
          </div>
        ) : null}
      </div>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Goal</dt>
          <dd>{cycle.goal ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Project</dt>
          <dd>{projectName ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Dates</dt>
          <dd>
            {formatDate(cycle.startsAt)} → {formatDate(cycle.endsAt)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Progress</dt>
          <dd>
            {cycle.progress.completed}/{cycle.progress.total} ·{' '}
            {cycle.progress.completedEstimatePoints}/
            {cycle.progress.estimatePoints} points
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Throughput</dt>
          <dd>{cycle.throughput.completedInWindow} completed in window</dd>
        </div>
      </dl>
      {cycle.description ? (
        <div className="text-muted-foreground text-sm">{cycle.description}</div>
      ) : null}
    </div>
  )
}
