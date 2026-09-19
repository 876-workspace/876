import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/clients/projects'

import { EditTemplateForm } from './edit-template-form'

export async function EditTemplateData({
  orgId,
  templateId,
}: {
  orgId: string
  templateId: string
}) {
  const result = await projects.projectTemplates.retrieve(
    orgId,
    decodeURIComponent(templateId)
  )

  if (result.error?.code === 'projects/template-not-found') notFound()
  if (result.error || !result.data)
    return (
      <AppError
        title="The template could not be loaded"
        error={
          result.error ?? {
            code: 'projects/template-unavailable',
            message: 'The template could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  return (
    <EditTemplateForm
      template={{
        id: result.data.id,
        name: result.data.name,
        description: result.data.description,
      }}
    />
  )
}
