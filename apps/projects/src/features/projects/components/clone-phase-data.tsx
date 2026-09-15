import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { ClonePhaseForm } from '@/features/projects/components/clone-phase-form'
import { projects } from '@/lib/services/projects'

export async function ClonePhaseData({
  orgId,
  phaseId,
}: {
  orgId: string
  phaseId: string
}) {
  const result = await projects.milestones.retrieve(orgId, phaseId)

  if (result.error?.code === 'projects/milestone-not-found') notFound()
  if (result.error || !result.data)
    return (
      <AppError
        title="The phase could not be loaded"
        error={
          result.error ?? {
            code: 'projects/phase-unavailable',
            message: 'The phase could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  return <ClonePhaseForm phase={result.data} />
}
