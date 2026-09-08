import type { WorkMyWork } from '@876/work'
import { cn } from '@876/core/utils'

export type WorkSummaryProps = {
  work: WorkMyWork
  className?: string
}

const summaryItems = [
  { key: 'events', label: 'Events' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'reminders', label: 'Reminders' },
  { key: 'overdueTasks', label: 'Overdue' },
] as const

export function WorkSummary({ work, className }: WorkSummaryProps) {
  return (
    <div className={cn('space-y-4 p-4', className)}>
      <div>
        <p className="text-sm font-semibold">Today</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Your Work activity for the current day.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        {summaryItems.map(({ key, label }) => (
          <div
            key={key}
            className="border-876-surface-border bg-876-surface rounded-xl border p-3"
          >
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">
              {work[key].length}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
