import { ImportJobList } from '@876/projects-ui/platform/import-job-list'
import { AppError } from '@876/ui/app-error'
import { buttonVariants } from '@876/ui/button'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { IMPORT_SOURCE_VALUES, toUiImportJob } from '@/lib/integration-mappers'
import { integration } from '@/lib/services/integration'

import { ImportUploadForm } from './_components/import-upload-form'

export const metadata = { title: 'Imports' }

export default async function ImportsPage() {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const { orgId } = await requireProjectsContext()
  const result = await integration.listImportJobs(orgId)

  const jobs = (result.data?.data ?? []).map(toUiImportJob)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <h1 className="876-page-title mb-2">Imports</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Upload a CSV or board export, preview the parsed rows, then commit the job.
        Files are read in the browser and must be 5 MB or smaller.
      </p>
      <div className="flex max-w-3xl flex-col gap-8">
        <section aria-label="New import" className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">New import</h2>
          <ImportUploadForm sources={[...IMPORT_SOURCE_VALUES]} />
        </section>
        <section aria-label="Exports" className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Exports</h2>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/exports/work-items"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Export work items (CSV)
            </a>
            <a
              href="/api/exports/time-entries"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Export time entries (CSV)
            </a>
          </div>
        </section>
        <section aria-label="Import jobs" className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Jobs</h2>
          {result.error ? (
            <AppError
              title="Import jobs could not be loaded"
              error={result.error}
              variant="banner"
            />
          ) : null}
          <ImportJobList jobs={jobs} />
          {jobs.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {jobs.map((job) => (
                <li key={job.id}>
                  <a
                    href={`/settings/imports/${encodeURIComponent(job.id)}`}
                    className="text-sm font-medium underline underline-offset-4"
                  >
                    {job.id}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </div>
  )
}
