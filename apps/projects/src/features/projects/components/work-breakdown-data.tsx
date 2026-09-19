import { AppError } from '@876/ui/app-error'

import { WorkBreakdown } from '@/features/projects/components/work-breakdown'
import { loadMemberLabels } from '@/features/projects/member-labels'
import { canAccess, resolveAccessContext } from '@/lib/auth/access-context'
import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/clients/projects'

export async function WorkBreakdownData({
  orgId,
  projectId,
}: {
  orgId: string
  projectId: string
}) {
  const { userId } = await requireProjectsContext()
  const [breakdown, members, access] = await Promise.all([
    projects.taskLists.workBreakdown(orgId, projectId),
    loadMemberLabels(orgId),
    resolveAccessContext(userId, orgId),
  ])

  if (breakdown.error || !breakdown.data)
    return (
      <AppError
        title="The work breakdown could not be loaded"
        error={
          breakdown.error ?? {
            code: 'projects/work-breakdown-unavailable',
            message: 'The work breakdown could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  return (
    <div className="space-y-4">
      {members.error ? (
        <AppError
          title="Some work breakdown data could not be loaded"
          error={members.error}
          variant="banner"
        />
      ) : null}
      <WorkBreakdown
        breakdown={breakdown.data}
        ownerLabels={members.labels}
        canEdit={
          access.status === 'ok' && canAccess(access.context, 'projects.edit')
        }
      />
    </div>
  )
}
