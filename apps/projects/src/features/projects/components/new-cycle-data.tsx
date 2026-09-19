import { AppError } from '@876/ui/app-error'

import { CycleForm } from '@/features/projects/components/cycle-form'
import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/clients/projects'

export async function NewCycleData() {
  const { orgId } = await requireProjectsContext()
  const projectList = await projects.projects.list(orgId, { limit: 100 })

  return (
    <div className="space-y-4">
      {projectList.error ? (
        <AppError
          title="Some cycle form data could not be loaded"
          error={projectList.error}
          variant="banner"
        />
      ) : null}
      <CycleForm mode="create" projects={projectList.data?.data ?? []} />
    </div>
  )
}
