import { AppError } from '@876/ui/app-error'

import { PhaseForm } from '@/features/projects/components/phase-form'
import { loadMemberLabels } from '@/features/projects/member-labels'
import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'

export async function NewPhaseData() {
  const { orgId } = await requireProjectsContext()
  const [projectList, members] = await Promise.all([
    projects.projects.list(orgId, { limit: 100 }),
    loadMemberLabels(orgId),
  ])

  const loadError = projectList.error ?? members.error
  const memberOptions = Object.entries(members.labels).map(([userId, label]) => ({
    userId,
    label,
  }))

  return (
    <div className="space-y-4">
      {loadError ? (
        <AppError
          title="Some phase form data could not be loaded"
          error={loadError}
          variant="banner"
        />
      ) : null}
      <PhaseForm
        mode="create"
        projects={projectList.data?.data ?? []}
        members={memberOptions}
      />
    </div>
  )
}
