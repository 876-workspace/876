import Link from 'next/link'

import { ImportJobList } from '@876/projects-ui/platform/import-job-list'
import { AppError } from '@876/ui/app-error'

import { toUiImportJob } from '../projects-integration-mappers'
import { projects } from '@/lib/clients/projects'

/**
 * The data half of the Imports list, shared by every host.
 * Read-only: import job history with links into each job's preview detail.
 */
export async function ImportsData({
  organizationId,
  base,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
}) {
  const result = await projects.importJobs.list(organizationId)
  const jobs = (result.data?.data ?? []).map(toUiImportJob)

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Import data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <ImportJobList jobs={jobs} />
      {jobs.length > 0 ? (
        <ul className="space-y-1">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                className="text-sm underline"
                href={`${base}/imports/${encodeURIComponent(job.id)}`}
              >
                View import {job.id}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
