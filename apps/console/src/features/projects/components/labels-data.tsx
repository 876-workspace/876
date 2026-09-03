import { AppError } from '@876/ui/app-error'

import { projects } from '@/lib/services/projects'
import { LabelsTable } from '@876/projects-ui/labels-list'

export async function LabelsData({
  organizationId,
}: {
  organizationId: string
}) {
  const result = await projects.labels.list(organizationId)

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Label data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <LabelsTable labels={result.data?.data ?? []} />
    </div>
  )
}
