import { AppError } from '@876/ui/app-error'

import { GanttBaselines } from '@/features/projects/components/gantt-baselines'
import { GanttView } from '@/features/projects/components/gantt-view'
import { canAccess, resolveAccessContext } from '@/lib/auth/access-context'
import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/clients/projects'

export async function GanttData({
  orgId,
  projectId,
  baselineId,
}: {
  orgId: string
  projectId: string
  baselineId?: string
}) {
  const { userId } = await requireProjectsContext()
  const [ganttResult, baselineResult, access] = await Promise.all([
    projects.gantt.retrieve(orgId, projectId, { includeSubItems: true }),
    projects.baselines.list(orgId, projectId),
    resolveAccessContext(userId, orgId),
  ])

  if (ganttResult.error || !ganttResult.data)
    return (
      <AppError
        title="The timeline could not be loaded"
        error={
          ganttResult.error ?? {
            code: 'projects/gantt-unavailable',
            message: 'The timeline could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  const baselines = baselineResult.data?.data ?? []
  const selectedBaselineId = baselineId ?? baselines[0]?.id ?? null
  const comparisonResult = selectedBaselineId
    ? await projects.baselines.comparison(orgId, projectId, selectedBaselineId)
    : null
  const baselineError = baselineResult.error ?? comparisonResult?.error ?? null
  const canEdit =
    access.status === 'ok' && canAccess(access.context, 'projects.edit')

  return (
    <div className="space-y-4">
      {baselineError ? (
        <AppError
          title="Some baseline data could not be loaded"
          error={baselineError}
          variant="banner"
        />
      ) : null}
      <GanttView
        gantt={ganttResult.data}
        issuesBaseHref="/issues"
        canEdit={canEdit}
      />
      <GanttBaselines
        projectId={projectId}
        baselines={baselines}
        selectedBaselineId={selectedBaselineId}
        comparison={comparisonResult?.data ?? null}
        canEdit={canEdit}
      />
    </div>
  )
}
