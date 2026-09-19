import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/clients/projects'

import { projectTimeHref } from './time-links'
import { TimeEntriesPanel } from './time-entries-panel'
import { todayEntryDate } from './time-entry-input'
import { toTimeEntryRows } from './time-entry-rows'
import { TimerPanel } from './timer-panel'
import { toTimerState } from './timer-state'

type Props = {
  orgId: string
  userId: string
  projectId: string
  /** `new` opens the add form; any other value names the entry being edited. */
  entryParam?: string
  canEdit: boolean
}

export async function ProjectTimeData({
  orgId,
  userId,
  projectId,
  entryParam,
  canEdit,
}: Props) {
  const [entriesResult, issuesResult, projectResult, timerResult] =
    await Promise.all([
      projects.timeEntries.list(orgId, { projectId }),
      projects.issues.list(orgId, { project: projectId, limit: 100 }),
      projects.projects.retrieve(orgId, projectId),
      projects.timeEntries.currentTimer(orgId, userId),
    ])

  if (projectResult.error?.code === 'projects/project-not-found') notFound()

  const loadError =
    entriesResult.error ??
    issuesResult.error ??
    projectResult.error ??
    timerResult.error
  const entries = entriesResult.data?.data ?? []
  const projectName = projectResult.data?.name ?? projectId
  const projectNames = new Map([[projectId, projectName]])
  const issueTitles = new Map(
    (issuesResult.data?.data ?? []).map((issue) => [issue.id, issue.title])
  )
  const editingEntry =
    entryParam && entryParam !== 'new'
      ? (entries.find((entry) => entry.id === entryParam) ?? null)
      : null
  const projectOptions = [{ id: projectId, name: projectName }]

  return (
    <div className="space-y-4">
      {loadError ? (
        <AppError
          title="Some time data could not be loaded"
          error={loadError}
          variant="banner"
        />
      ) : null}

      <TimerPanel
        timer={toTimerState(timerResult.data, projectNames)}
        projects={projectOptions}
        fixedProjectId={projectId}
        disabled={!canEdit}
      />

      <TimeEntriesPanel
        rows={toTimeEntryRows(entries, { projectNames, issueTitles })}
        projects={projectOptions}
        baseHref={projectTimeHref(projectId)}
        defaultDate={todayEntryDate()}
        projectId={projectId}
        canEdit={canEdit}
        createOpen={entryParam === 'new'}
        editingEntry={editingEntry}
        emptyTitle="No time logged against this project yet."
      />
    </div>
  )
}
