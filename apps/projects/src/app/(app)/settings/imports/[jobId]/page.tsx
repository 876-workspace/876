import { ImportPreviewTable } from '@876/projects-ui/platform/import-preview-table'
import { UnmappedFieldsTable } from '@876/projects-ui/platform/unmapped-fields-table'
import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import {
  toUiImportPreview,
  toUiUnmappedFields,
} from '@/lib/integration-mappers'
import { integration } from '@/lib/clients/integration'

import { ImportJobCommitPanel } from './_components/import-job-commit-panel'

export const metadata = { title: 'Import job' }

type Props = { params: Promise<{ jobId: string }> }

export default async function ImportJobPage({ params }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const { orgId } = await requireProjectsContext()
  const { jobId } = await params
  const decodedId = decodeURIComponent(jobId)

  const [job, rows] = await Promise.all([
    integration.retrieveImportJob(orgId, decodedId),
    integration.listImportJobRows(orgId, decodedId),
  ])

  if (job.error?.code === 'projects/import-job-not-found') notFound()
  if (job.error || !job.data)
    return (
      <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
        <PageBreadcrumb
          href="/settings/imports"
          label="Imports"
          className="mb-4"
        />
        <AppError
          title="The import job could not be loaded"
          error={
            job.error ?? {
              code: 'projects/import-unavailable',
              message: 'The import job could not be loaded.',
            }
          }
          variant="banner"
        />
      </div>
    )

  const preview = toUiImportPreview(job.data.preview)
  const unmapped = toUiUnmappedFields(job.data.source, job.data.unmappedFields)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href="/settings/imports"
        label="Imports"
        className="mb-4"
      />
      <h1 className="876-page-title mb-2">Import job</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        {job.data.source} · {job.data.status} · {job.data.rowCount} rows ·{' '}
        {job.data.successCount} ready · {job.data.failureCount} with errors
      </p>
      <div className="flex max-w-4xl flex-col gap-8">
        <section aria-label="Preview" className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Preview</h2>
          <ImportPreviewTable rows={preview} />
        </section>
        <section aria-label="Unmapped fields" className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Unmapped fields</h2>
          <UnmappedFieldsTable fields={unmapped} />
        </section>
        {rows.error ? (
          <AppError
            title="Import rows could not be loaded"
            error={rows.error}
            variant="banner"
          />
        ) : null}
        <ImportJobCommitPanel
          jobId={job.data.id}
          status={job.data.status}
          failureCount={job.data.failureCount}
        />
      </div>
    </div>
  )
}
