import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { AppError } from '@876/ui/app-error'
import { TemplateSummary } from '@876/projects-ui/templates/template-summary'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { FROM_TEMPLATE_PATH } from '../template-preview-query'
import { TemplatePreviewData } from './template-preview-data'
import { TemplateStartForm } from './template-start-form'
import { TemplateVersionTable } from './template-version-table'
import { formatDateInput, parseDateInput, todaySeconds } from '@/lib/date-input'
import { projects } from '@/lib/services/projects'

export async function TemplateDetailData({
  orgId,
  templateId,
  start,
}: {
  orgId: string
  templateId: string
  start: string | undefined
}) {
  const [templateResult, versionsResult] = await Promise.all([
    projects.projectTemplates.retrieve(orgId, templateId),
    projects.projectTemplates.versions(orgId, templateId),
  ])

  if (templateResult.error?.code === 'projects/template-not-found') notFound()
  if (templateResult.error || !templateResult.data)
    return (
      <AppError
        title="The template could not be loaded"
        error={
          templateResult.error ?? {
            code: 'projects/template-unavailable',
            message: 'The template could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  const template = templateResult.data
  const basePath = `/settings/templates/${encodeURIComponent(template.id)}`
  const startDate = parseDateInput(start ?? '') ?? todaySeconds()

  return (
    <div className="space-y-5">
      <ResourceToolbar
        title={template.name}
        primaryLabel="Use"
        primaryVariant="info"
        primaryHref={`${FROM_TEMPLATE_PATH}?templateId=${encodeURIComponent(template.id)}&start=${formatDateInput(startDate)}`}
        dropdownActions={[{ label: 'Edit', href: `${basePath}/edit` }]}
        refresh
      />

      {versionsResult.error ? (
        <AppError
          title="The versions could not be loaded"
          error={versionsResult.error}
          variant="banner"
        />
      ) : null}

      <TemplateSummary template={template} />
      <TemplateVersionTable versions={versionsResult.data?.data ?? []} />

      <TemplateStartForm basePath={basePath} startDate={formatDateInput(startDate)} />

      <Suspense
        fallback={<div className="876-card h-64 animate-pulse" aria-hidden />}
      >
        <TemplatePreviewData
          orgId={orgId}
          templateId={template.id}
          startDate={startDate}
          include={{
            includeWorkItems: true,
            includeDependencies: true,
            includeBudgets: true,
          }}
        />
      </Suspense>
    </div>
  )
}
