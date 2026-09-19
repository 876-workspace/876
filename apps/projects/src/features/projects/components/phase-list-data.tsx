import { PhaseList } from '@876/projects-ui/phase-list'
import { AppError } from '@876/ui/app-error'

import { PhaseFilterBar } from '@/features/projects/components/phase-filter-bar'
import { loadMemberLabels } from '@/features/projects/member-labels'
import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/clients/projects'
import type { PhaseStatus } from '@/types/planning'

export async function PhaseListData({
  project,
  status,
}: {
  project?: string
  status?: PhaseStatus
}) {
  const { orgId } = await requireProjectsContext()
  const [projectList, members] = await Promise.all([
    projects.projects.list(orgId, { limit: 100 }),
    loadMemberLabels(orgId),
  ])

  const phases = project
    ? await projects.milestones.list(orgId, project, { status })
    : await projects.milestones.listAll(orgId, { status })

  const loadError = phases.error ?? projectList.error ?? members.error

  return (
    <div className="space-y-4">
      <PhaseFilterBar
        projects={projectList.data?.data ?? []}
        project={project ?? ''}
        status={status ?? 'all'}
      />
      {loadError ? (
        <AppError
          title="Some phase data could not be loaded"
          error={loadError}
          variant="banner"
        />
      ) : null}
      <PhaseList
        phases={phases.data?.data ?? []}
        projects={projectList.data?.data ?? []}
        ownerLabels={members.labels}
      />
    </div>
  )
}
