'use client'

import type { Cycle, Issue } from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { useState } from 'react'

import { CycleHeader } from '@/features/projects/components/cycle-header'
import { CycleIssuePicker } from '@/features/projects/components/cycle-issue-picker'
import { CycleIssues } from '@/features/projects/components/cycle-issues'

export function CycleDetailClient({
  cycle,
  projectName,
  assignedIssues,
  unassignedIssues,
  canEdit,
}: {
  cycle: Cycle
  projectName: string | null
  assignedIssues: readonly Issue[]
  unassignedIssues: readonly Issue[]
  canEdit: boolean
}) {
  const [error, setError] = useState<AppErrorValue | null>(null)

  return (
    <div className="space-y-6">
      {error ? (
        <AppError title="The cycle could not be updated" error={error} />
      ) : null}
      <CycleHeader
        cycle={cycle}
        projectName={projectName}
        canEdit={canEdit}
        onError={setError}
      />
      <CycleIssues
        cycleId={cycle.id}
        assignedIssues={assignedIssues}
        onError={setError}
      />
      {canEdit ? (
        <CycleIssuePicker
          cycleId={cycle.id}
          unassignedIssues={unassignedIssues}
          onError={setError}
        />
      ) : null}
    </div>
  )
}
