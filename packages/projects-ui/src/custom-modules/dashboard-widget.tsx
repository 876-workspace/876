import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { ChartBarIcon } from '@876/ui/icons'

import { formatDay } from '../finance/format-money'
import type { CustomModuleWidget, WidgetData } from './types'

export type DashboardWidgetProps = {
  widget: CustomModuleWidget
  data: WidgetData
}

function barWidth(count: number, largest: number): number {
  if (largest <= 0) return 0
  return Math.round((count / largest) * 100)
}

function RecordCountView({ count }: { count: number }) {
  return (
    <p className="text-lg font-semibold tabular-nums" data-slot="widget-count">
      {count}
    </p>
  )
}

function StatusBreakdownView({
  rows,
}: {
  rows: { statusKey: string; label: string; count: number }[]
}) {
  const largest = rows.reduce((top, row) => Math.max(top, row.count), 0)

  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">No items</p>
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.statusKey} className="space-y-1.5">
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
              data-status-bar={row.statusKey}
              style={{ width: `${barWidth(row.count, largest)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function RecentRecordsView({
  records,
}: {
  records: { id: string; title: string; statusKey: string; updatedAt: number }[]
}) {
  if (records.length === 0) {
    return <p className="text-muted-foreground text-sm">No items</p>
  }

  return (
    <ul className="divide-y">
      {records.map((record) => (
        <li
          key={record.id}
          data-slot="widget-recent-record"
          className="flex items-baseline justify-between gap-3 py-2 text-sm"
        >
          <span className="min-w-0 flex-1 truncate font-medium">
            {record.title}
          </span>
          <span className="text-muted-foreground shrink-0 text-xs">
            {record.statusKey} · {formatDay(record.updatedAt)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function DashboardWidget({ widget, data }: DashboardWidgetProps) {
  if (widget.kind !== data.kind) {
    return (
      <Empty className="py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ChartBarIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle>Widget data mismatch</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <section className="876-card space-y-3 p-5" data-slot="dashboard-widget">
      <h3 className="text-sm font-semibold">{widget.title}</h3>
      {data.kind === 'record-count' ? (
        <RecordCountView count={data.count} />
      ) : data.kind === 'status-breakdown' ? (
        <StatusBreakdownView rows={data.rows} />
      ) : (
        <RecentRecordsView records={data.records} />
      )}
    </section>
  )
}
