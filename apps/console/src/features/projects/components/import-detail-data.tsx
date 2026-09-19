import { notFound } from 'next/navigation'

import { ImportJobList } from '@876/projects-ui/platform/import-job-list'
import { ImportPreviewTable } from '@876/projects-ui/platform/import-preview-table'
import { UnmappedFieldsTable } from '@876/projects-ui/platform/unmapped-fields-table'
import { AppError } from '@876/ui/app-error'

import {
  toUiImportJob,
  toUiImportPreview,
  toUiUnmappedFields,
} from '../projects-integration-mappers'
import { projects } from '@/lib/clients/projects'

/**
 * The data half of the Import job detail, shared by every host.
 * Read-only: the job summary, its validation preview, and unmapped fields.
 * File contents are never rendered — only titles, statuses, and errors.
 */
export async function ImportDetailData({
  organizationId,
  jobId,
}: {
  organizationId: string
  jobId: string
}) {
  const decodedId = decodeURIComponent(jobId)
  const [jobResult, rowsResult] = await Promise.all([
    projects.importJobs.retrieve(organizationId, decodedId),
    projects.importJobs.listRows(organizationId, decodedId),
  ])

  if (jobResult.error?.code === 'projects/import-job-not-found') notFound()

  if (jobResult.error || !jobResult.data) {
    return (
      <AppError
        title="Import job could not be loaded"
        error={jobResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const job = jobResult.data
  const uiJob = toUiImportJob(job)
  const preview = toUiImportPreview(job.preview)
  const unmapped = toUiUnmappedFields(job.source, job.unmappedFields)

  return (
    <div className="space-y-6">
      {rowsResult.error ? (
        <AppError
          title="Some import rows could not be loaded"
          error={rowsResult.error}
          variant="banner"
          showCode
        />
      ) : null}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Job</h2>
        <ImportJobList jobs={[uiJob]} />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Preview</h2>
        <ImportPreviewTable rows={preview} />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Unmapped fields</h2>
        <UnmappedFieldsTable fields={unmapped} />
      </section>
    </div>
  )
}
