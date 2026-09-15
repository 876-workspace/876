import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { CycleDetailClient } from '@/features/projects/components/cycle-detail-client'
import { loadMemberLabels } from '@/features/projects/member-labels'
import { projects } from '@/lib/services/projects'

export async function CycleDetailData({
  orgId,
  cycleId,
  canEdit,
}: {
  orgId: string
  cycleId: string
  canEdit: boolean
}) {
  const resolvedOrgId = orgId
  const cycleResult = await projects.cycles.retrieve(
    resolvedOrgId,
    decodeURIComponent(cycleId),
  )

  if (cycleResult.error?.code === 'projects/cycle-not-found') notFound()
  if (cycleResult.error || !cycleResult.data)
    return (
      <AppError
        title="The cycle could not be loaded"
        error={
          cycleResult.error ?? {
            code: 'projects/cycle-unavailable',
            message: 'The cycle could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  const cycle = cycleResult.data
  const [projectResult, assignedIssues, unassignedIssues, members] =
    await Promise.all([
      cycle.projectId
        ? projects.projects.retrieve(resolvedOrgId, cycle.projectId)
        : Promise.resolve({
            data: null as null,
            error: null as null,
          }),
      projects.issues.list(resolvedOrgId, {
        project: cycle.projectId ?? undefined,
        limit: 100,
      }),
      projects.issues.list(resolvedOrgId, {
        project: cycle.projectId ?? undefined,
        limit: 100,
      }),
      loadMemberLabels(resolvedOrgId),
    ])

  const assigned = (assignedIssues.data?.data ?? []).filter(
    (issue) => issue.cycleId === cycle.id,
  )
  const unassigned = (unassignedIssues.data?.data ?? []).filter(
    (issue) => !issue.cycleId,
  )

  const loadError =
    projectResult.error ??
    assignedIssues.error ??
    unassignedIssues.error ??
    members.error

  return (
    <div className="space-y-4">
      {loadError ? (
        <AppError
          title="Some cycle data could not be loaded"
          error={loadError}
          variant="banner"
        />
      ) : null}
      <CycleDetailClient
        cycle={cycle}
        projectName={projectResult.data?.name ?? null}
        assignedIssues={assigned}
        unassignedIssues={unassigned}
        canEdit={canEdit}
      />
    </div>
  )
}

