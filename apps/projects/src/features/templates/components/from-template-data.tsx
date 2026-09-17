import { AppError } from '@876/ui/app-error'
import { Suspense } from 'react'

import { formatDateInput, todaySeconds } from '@/lib/date-input'
import { projects } from '@/lib/services/projects'

import { parseTemplatePreviewQuery } from '../template-preview-query'
import type { TemplatePreviewQuery } from '@/types/templates'
import { FromTemplateForm } from './from-template-form'
import { TemplatePreviewData } from './template-preview-data'

import type { FromTemplateSearch } from '@/types/templates'

export type { FromTemplateSearch }

export async function FromTemplateData({
  orgId,
  search,
}: {
  orgId: string
  search: FromTemplateSearch
}) {
  const listResult = await projects.projectTemplates.list(orgId)
  const templates = listResult.data?.data ?? []
  const query: TemplatePreviewQuery | null = parseTemplatePreviewQuery(search)

  return (
    <div className="space-y-5">
      {listResult.error ? (
        <AppError
          title="Templates could not be loaded"
          error={listResult.error}
          variant="banner"
        />
      ) : null}

      <FromTemplateForm
        templates={templates.map((template) => ({
          id: template.id,
          key: template.key,
          name: template.name,
        }))}
        initial={{
          templateId: query?.templateId ?? '',
          start: query
            ? formatDateInput(query.startDate)
            : formatDateInput(todaySeconds()),
          include: query?.include ?? {
            includeWorkItems: true,
            includeDependencies: true,
            includeBudgets: true,
          },
        }}
      />

      {query === null ? (
        <div className="876-card max-w-3xl p-6 text-sm">
          <p className="font-medium">Preview</p>
          <p className="text-muted-foreground mt-1">
            Choose a template and a start date to preview the project it
            creates.
          </p>
        </div>
      ) : (
        <Suspense
          fallback={<div className="876-card h-64 animate-pulse" aria-hidden />}
        >
          <TemplatePreviewData
            orgId={orgId}
            templateId={query.templateId}
            startDate={query.startDate}
            include={query.include}
          />
        </Suspense>
      )}
    </div>
  )
}
