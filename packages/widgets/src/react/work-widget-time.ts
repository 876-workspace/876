import type { WorkCalendarView } from '@876/work-ui/calendar'

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function currentDayWindow(now = new Date()) {
  const start = startOfDay(now)
  const end = addDays(start, 1)
  return {
    from: Math.floor(start.getTime() / 1000),
    to: Math.floor(end.getTime() / 1000),
  }
}

export function calendarWindow(view: WorkCalendarView, anchor: Date) {
  const day = startOfDay(anchor)
  if (view === 'day') {
    return {
      from: Math.floor(day.getTime() / 1000),
      to: Math.floor(addDays(day, 1).getTime() / 1000),
    }
  }

  if (view === 'week') {
    const start = addDays(day, -day.getDay())
    return {
      from: Math.floor(start.getTime() / 1000),
      to: Math.floor(addDays(start, 7).getTime() / 1000),
    }
  }

  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const start = addDays(first, -first.getDay())
  return {
    from: Math.floor(start.getTime() / 1000),
    to: Math.floor(addDays(start, 42).getTime() / 1000),
  }
}

export function moveCalendarAnchor(
  view: WorkCalendarView,
  anchor: Date,
  direction: 'previous' | 'today' | 'next'
): Date {
  if (direction === 'today') return new Date()
  const amount = direction === 'previous' ? -1 : 1
  if (view === 'day') return addDays(anchor, amount)
  if (view === 'week') return addDays(anchor, amount * 7)
  return new Date(anchor.getFullYear(), anchor.getMonth() + amount, 1)
}
