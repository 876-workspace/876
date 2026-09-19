import Link from 'next/link'

import { AppError } from '@876/ui/app-error'
import { TemplatePreviewTable } from '@876/projects-ui/templates/template-preview-table'
import { TemplateSummary } from '@876/projects-ui/templates/template-summary'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/clients/projects'

import { formatOperatorDateOrDash } from './operator-format'

/**
 * The data half of the Template detail, shared by every host. Read-only:
 * versions and a start-anchored preview, no instantiate affordances.
 */
export async function TemplateDetailData({
  organizationId,
  base,
  templateId,
  startDate,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  templateId: string
  /** Preview anchor as Unix seconds, already resolved by the route. */
  startDate: number
}) {
  const templateResult = await projects.projectTemplates.retrieve(
    organizationId,
    decodeURIComponent(templateId)
  )

  if (templateResult.error?.code === 'projects/template-not-found') notFound()

  if (templateResult.error || !templateResult.data) {
    return (
      <AppError
        title="Template could not be loaded"
        error={templateResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const template = templateResult.data
  const [versionsResult, previewResult] = await Promise.all([
    projects.projectTemplates.versions(organizationId, template.id),
    projects.projectTemplates.preview(organizationId, template.id, {
      startDate,
    }),
  ])

  const loadError = versionsResult.error ?? previewResult.error
  const versions = versionsResult.data?.data ?? []

  return (
    <div className="space-y-6">
      {loadError ? (
        <AppError
          title="Some template details could not be loaded"
          error={loadError}
          variant="banner"
          showCode
        />
      ) : null}
      <TemplateSummary template={template} />
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Versions</h3>
        {versions.length === 0 ? (
          <div className="876-card text-muted-foreground px-5 py-10 text-center text-sm">
            No versions yet.
          </div>
        ) : (
          <div className="876-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-left text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">Version</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {versions.map((version) => (
                  <tr key={version.id}>
                    <td className="px-4 py-3 font-medium tabular-nums">
                      {`v${version.version}`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatOperatorDateOrDash(version.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Preview</h3>
        {previewResult.data ? (
          <TemplatePreviewTable preview={previewResult.data} />
        ) : (
          <div className="876-card text-muted-foreground px-5 py-10 text-center text-sm">
            Preview could not be loaded.
          </div>
        )}
      </section>
      <Link
        href={`${base}/templates`}
        className="text-muted-foreground text-sm hover:underline"
      >
        Back to templates
      </Link>
    </div>
  )
}
