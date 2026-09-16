import { Badge } from '@876/ui/badge'

import { formatDay } from '../finance/format-money'
import type { ImportJob } from './types'

export type ImportJobListProps = {
  jobs: readonly ImportJob[]
}

export const IMPORT_JOB_SOURCE_LABELS: Record<ImportJob['source'], string> = {
  csv: 'CSV',
  'jira-csv': 'Jira CSV',
  'jira-json': 'Jira JSON',
  'trello-json': 'Trello JSON',
  'asana-csv': 'Asana CSV',
  'zoho-csv': 'Zoho CSV',
}

export const IMPORT_JOB_STATUS_LABELS: Record<ImportJob['status'], string> = {
  previewing: 'Previewing',
  ready: 'Ready',
  committing: 'Committing',
  completed: 'Completed',
  failed: 'Failed',
}

function statusVariant(status: ImportJob['status']): 'success' | 'destructive' | 'secondary' {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'destructive'
  return 'secondary'
}

export function ImportJobList({ jobs }: ImportJobListProps) {
  if (jobs.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        No import jobs yet
      </p>
    )
  }

  return (
    <ul data-slot="import-job-list" className="flex flex-col gap-2">
      {jobs.map((job) => (
        <li key={job.id} className="rounded-md border px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">
              {IMPORT_JOB_SOURCE_LABELS[job.source]}
            </span>
            <Badge variant={statusVariant(job.status)}>
              {IMPORT_JOB_STATUS_LABELS[job.status]}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2 text-xs tabular-nums">
            {job.rowCount} rows · {job.errorCount} errors · {job.importedCount}{' '}
            imported
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Created {formatDay(job.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  )
}
