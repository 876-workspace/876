import { TemplateList } from '@876/projects-ui/templates/template-list'
import { AppError } from '@876/ui/app-error'

import { projects } from '@/lib/clients/projects'

export async function TemplatesData({ orgId }: { orgId: string }) {
  const result = await projects.projectTemplates.list(orgId)

  return (
    <div className="space-y-4">
      {result.error ? (
        <AppError
          title="Templates could not be loaded"
          error={result.error}
          variant="banner"
        />
      ) : null}
      <TemplateList
        templates={result.data?.data ?? []}
        hrefBase="/settings/templates"
      />
    </div>
  )
}
