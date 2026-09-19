import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/clients/projects'
import { RateForm } from './rate-form'

export async function EditRateData({
  orgId,
  projectId,
  rateId,
}: {
  orgId: string
  projectId: string
  rateId: string
}) {
  const decodedProject = decodeURIComponent(projectId)
  const rateResult = await projects.rates.retrieve(
    orgId,
    decodedProject,
    decodeURIComponent(rateId)
  )

  if (rateResult.error?.code === 'projects/rate-not-found') notFound()
  if (rateResult.error || !rateResult.data)
    return (
      <AppError
        title="The rate could not be loaded"
        error={
          rateResult.error ?? {
            code: 'projects/rate-unavailable',
            message: 'The rate could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  return (
    <RateForm
      mode="edit"
      projectId={decodedProject}
      rate={rateResult.data}
    />
  )
}
