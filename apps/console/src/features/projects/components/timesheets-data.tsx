import Link from 'next/link'

import { AppError } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'
import type { TimesheetStatus } from '@876/projects/contracts'

import { projects } from '@/lib/clients/projects'

import { formatOperatorDateOrDash } from './operator-format'

function statusBadge(status: string) {
  if (status === 'approved') return <Badge variant="success">Approved</Badge>
  if (status === 'submitted') return <Badge variant="info">Submitted</Badge>
  if (status === 'rejected')
    return <Badge variant="destructive">Rejected</Badge>
  return <Badge variant="secondary">Draft</Badge>
}

/**
 * The data half of the Timesheets list, shared by every host.
 * `@876/projects-ui` ships no timesheet list presentation, so this table is
 * Console-local markup; the detail reuses the shared summary.
 */
export async function TimesheetsData({
  organizationId,
  base,
  status,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  /** Already narrowed by the route's isApprovalStatus guard. */
  status?: TimesheetStatus
}) {
  const result = await projects.timesheets.list(organizationId, {
    ...(status ? { status } : {}),
  })

  const timesheets = (result.data?.data ?? []).toSorted(
    (left, right) => right.periodStart - left.periodStart
  )

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Some timesheet data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      {timesheets.length === 0 ? (
        <div className="876-card text-muted-foreground px-5 py-10 text-center text-sm">
          No timesheets yet.
        </div>
      ) : (
        <div className="876-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-left text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {timesheets.map((timesheet) => (
                  <tr key={timesheet.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`${base}/time/timesheets/${encodeURIComponent(timesheet.id)}`}
                        className="font-medium hover:underline"
                      >
                        {formatOperatorDateOrDash(timesheet.periodStart)} –{' '}
                        {formatOperatorDateOrDash(timesheet.periodEnd)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {timesheet.userId}
                    </td>
                    <td className="px-4 py-3">
                      {statusBadge(timesheet.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatOperatorDateOrDash(timesheet.submittedAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatOperatorDateOrDash(timesheet.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
