'use client'

import { useState } from 'react'

import type { Gantt, GanttZoom } from '@876/projects/contracts'
import { ProjectGantt } from '@876/projects-ui/project-gantt'

/**
 * The operator Gantt: zoom stays local presentation state and rescheduling is
 * disabled, so the server passes plain data and no callbacks cross the RSC
 * boundary. Console is read-only until operator mutations ship with audit
 * events — see the plan binding in `plans/sep/16-projects-console-parity`.
 */
export function ReadOnlyGanttView({
  gantt,
  issuesBaseHref,
}: {
  gantt: Gantt
  issuesBaseHref: string
}) {
  const [zoom, setZoom] = useState<GanttZoom>('week')

  return (
    <ProjectGantt
      gantt={gantt}
      issuesBaseHref={issuesBaseHref}
      zoom={zoom}
      onZoomChange={setZoom}
      onReschedule={() => {}}
      canEdit={false}
    />
  )
}
