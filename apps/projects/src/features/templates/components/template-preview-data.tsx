import type { TemplateIncludeFlags } from '@876/projects/contracts'
import { TemplatePreviewTable } from '@876/projects-ui/templates/template-preview-table'
import { AppError } from '@876/ui/app-error'

import { projects } from '@/lib/clients/projects'

export async function TemplatePreviewData({
  orgId,
  templateId,
  startDate,
  include,
}: {
  orgId: string
  templateId: string
  startDate: number
  include: Required<TemplateIncludeFlags>
}) {
  const result = await projects.projectTemplates.preview(orgId, templateId, {
    startDate,
    ...include,
  })

  if (result.error || !result.data)
    return (
      <AppError
        title="The preview could not be built"
        error={
          result.error ?? {
            code: 'projects/template-preview-unavailable',
            message: 'The preview could not be built.',
          }
        }
        variant="banner"
      />
    )

  return <TemplatePreviewTable preview={result.data} />
}
