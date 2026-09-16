'use client'

import type { Gantt, GanttZoom } from '@876/projects/contracts'
import {
  ProjectGantt,
  type GanttReschedule,
} from '@876/projects-ui/project-gantt'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { issuesClient } from '@/lib/client'

type Props = {
  gantt: Gantt
  issuesBaseHref: string
  canEdit: boolean
}

/**
 * Owns the presentation zoom and persists a drag or key press as a planned-date
 * update on that single work item. Scheduling stays advisory: nothing else is
 * rescheduled, and the server read model is refetched to confirm the write.
 */
export function GanttView({ gantt, issuesBaseHref, canEdit }: Props) {
  const router = useRouter()
  const [zoom, setZoom] = useState<GanttZoom>('day')
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function reschedule(change: GanttReschedule) {
    setError(null)
    const result = await issuesClient.update(change.issueId, {
      plannedStartDate: change.plannedStart,
      plannedFinishDate: change.plannedFinish,
    })

    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/schedule-write-failed',
          message: 'The new planned dates could not be saved.',
        }
      )
      return
    }

    router.refresh()
  }

  return (
    <div className="space-y-3">
      {error ? (
        <AppError
          title="The new dates could not be saved"
          error={error}
          variant="banner"
        />
      ) : null}
      <ProjectGantt
        gantt={gantt}
        issuesBaseHref={issuesBaseHref}
        zoom={zoom}
        onZoomChange={setZoom}
        onReschedule={reschedule}
        canEdit={canEdit}
      />
    </div>
  )
}
