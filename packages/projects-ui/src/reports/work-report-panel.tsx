import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { ChartBarIcon } from '@876/ui/icons'

import type { CountRow, WorkReport } from './types'

export type WorkReportPanelProps = {
  report: WorkReport
}

function barWidth(count: number, largest: number): number {
  if (largest <= 0) return 0
  return Math.round((count / largest) * 100)
}

function CountBreakdown({
  title,
  rows,
}: {
  title: string
  rows: readonly CountRow[]
}) {
  const largest = rows.reduce((top, row) => Math.max(top, row.count), 0)

  return (
    <section className="876-card space-y-3 p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No items</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{row.label}</span>
                <span className="tabular-nums">{row.count}</span>
              </div>
              <div
                className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
                aria-hidden="true"
              >
                <div
                  className="h-full bg-sky-500"
                  data-count-bar={row.key}
                  style={{ width: `${barWidth(row.count, largest)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function WorkReportPanel({ report }: WorkReportPanelProps) {
  if (report.total === 0) {
    return (
      <Empty className="py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ChartBarIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle>No items in this period</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="space-y-4">
      <dl className="876-card grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Items
          </dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">
            {report.total}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Overdue
          </dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">
            <span
              className={report.overdue > 0 ? 'text-destructive' : undefined}
            >
              {report.overdue}
            </span>
          </dd>
        </div>
      </dl>
      <div className="grid gap-4 lg:grid-cols-3">
        <CountBreakdown title="By state" rows={report.byState} />
        <CountBreakdown title="By type" rows={report.byType} />
        <CountBreakdown title="By assignee" rows={report.byAssignee} />
      </div>
    </div>
  )
}
