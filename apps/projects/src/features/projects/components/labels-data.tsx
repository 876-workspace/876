import { LabelsTable } from '@876/projects-ui/labels-list'
import { AppError } from '@876/ui/app-error'

import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'

export async function LabelsData() {
  const { orgId } = await requireProjectsContext()
  const result = await projects.labels.list(orgId)

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Some label data could not be loaded"
          error={result.error}
          variant="banner"
        />
      ) : null}
      <LabelsTable labels={result.data?.data ?? []} />
    </div>
  )
}
