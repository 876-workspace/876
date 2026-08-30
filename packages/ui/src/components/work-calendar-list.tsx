import type { WorkCalendar } from '@876/work'
import type { ReactNode } from 'react'

import { cn } from '../lib/utils'

export type WorkCalendarListProps = {
  calendars: readonly WorkCalendar[]
  activeCalendarId?: string | null
  className?: string
  empty?: ReactNode
  onSelect?: (calendar: WorkCalendar) => void
}

/** Controlled, provider-agnostic calendar selector for Work-backed surfaces. */
export function WorkCalendarList({
  calendars,
  activeCalendarId,
  className,
  empty = 'No calendars',
  onSelect,
}: WorkCalendarListProps) {
  if (calendars.length === 0)
    return (
      <div className={cn('text-muted-foreground text-sm', className)}>
        {empty}
      </div>
    )

  return (
    <div className={cn('space-y-1', className)}>
      {calendars.map((calendar) => (
        <button
          key={calendar.id}
          type="button"
          aria-pressed={calendar.id === activeCalendarId}
          className={cn(
            'hover:bg-muted flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm',
            calendar.id === activeCalendarId && 'bg-muted font-medium'
          )}
          onClick={() => onSelect?.(calendar)}
        >
          <span className="truncate">{calendar.name}</span>
          {calendar.isPrimary ? (
            <span className="text-muted-foreground ml-3 text-xs">Primary</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
