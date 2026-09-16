import { AppError } from '@876/ui/app-error'
import { TemplateList } from '@876/projects-ui/templates/template-list'

import { projects } from '@/lib/services/projects'

/**
 * The data half of the Templates list, shared by every host. Rows render
 * through the shared `@876/projects-ui` template list; links resolve against
 * the host's Projects root.
 */
export async function TemplatesData({
  organizationId,
  base,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
}) {
  const result = await projects.projectTemplates.list(organizationId)

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Template data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <TemplateList
        templates={result.data?.data ?? []}
        hrefBase={`${base}/templates`}
      />
    </div>
  )
}
