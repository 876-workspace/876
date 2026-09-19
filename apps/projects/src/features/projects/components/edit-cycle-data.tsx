import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { CycleForm } from '@/features/projects/components/cycle-form'
import { projects } from '@/lib/clients/projects'

export async function EditCycleData({
  orgId,
  cycleId,
}: {
  orgId: string
  cycleId: string
}) {
  const [cycleResult, projectList] = await Promise.all([
    projects.cycles.retrieve(orgId, decodeURIComponent(cycleId)),
    projects.projects.list(orgId, { limit: 100 }),
  ])

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

  return (
    <div className="space-y-4">
      {projectList.error ? (
        <AppError
          title="Some cycle form data could not be loaded"
          error={projectList.error}
          variant="banner"
        />
      ) : null}
      <CycleForm
        mode="edit"
        cycle={cycleResult.data}
        projects={projectList.data?.data ?? []}
      />
    </div>
  )
}
