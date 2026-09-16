import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/services/projects'

import { CloneProjectForm } from './clone-project-form'

export async function CloneProjectData({
  orgId,
  projectId,
}: {
  orgId: string
  projectId: string
}) {
  const result = await projects.projects.retrieve(
    orgId,
    decodeURIComponent(projectId)
  )

  if (result.error?.code === 'projects/project-not-found') notFound()
  if (result.error || !result.data)
    return (
      <AppError
        title="The project could not be loaded"
        error={
          result.error ?? {
            code: 'projects/project-unavailable',
            message: 'The project could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  return (
    <CloneProjectForm
      project={{
        id: result.data.id,
        name: result.data.name,
        key: result.data.key,
      }}
    />
  )
}
