import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { PhaseForm } from '@/features/projects/components/phase-form'
import { loadMemberLabels } from '@/features/projects/member-labels'
import { projects } from '@/lib/services/projects'

export async function EditPhaseData({
  orgId,
  phaseId,
}: {
  orgId: string
  phaseId: string
}) {
  const [phaseResult, projectList, members] = await Promise.all([
    projects.milestones.retrieve(orgId, phaseId),
    projects.projects.list(orgId, { limit: 100 }),
    loadMemberLabels(orgId),
  ])

  if (phaseResult.error?.code === 'projects/milestone-not-found') notFound()
  if (phaseResult.error || !phaseResult.data)
    return (
      <AppError
        title="The phase could not be loaded"
        error={
          phaseResult.error ?? {
            code: 'projects/phase-unavailable',
            message: 'The phase could not be loaded.',
          }
        }
        variant="banner"
      />
    )

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
        mode="edit"
        phase={phaseResult.data}
        projects={projectList.data?.data ?? []}
        members={memberOptions}
      />
    </div>
  )
}
