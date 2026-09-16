import { buttonVariants } from '@876/ui/button'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import {
  CALENDAR_VIEWS,
  calendarHref,
  calendarNavHref,
  calendarTodayUtc,
  calendarWindowLabel,
  parseCalendarTimestamp,
  parseCalendarView,
  resolveCalendarWindow,
  type CalendarSearchParams,
  type CalendarView,
} from '@/features/projects/calendar-range'
import {
  CalendarData,
  CalendarGridSkeleton,
  CalendarLegend,
} from '@/features/projects/components/calendar-data'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'Calendar' }

const VIEW_LABELS: Record<CalendarView, string> = {
  month: 'Month',
  week: 'Week',
  list: 'List',
}

type Props = { searchParams: Promise<CalendarSearchParams> }

/**
 * The window is resolved here, from the search params, so the period label and
 * the view switch are part of the first paint; only the entries stream in.
 */
export default async function CalendarPage({ searchParams }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const { orgId } = await requireProjectsContext()

  const params = await searchParams
  const view = parseCalendarView(params.view)
  const anchor = parseCalendarTimestamp(params.from)
  const project = params.project?.trim() || null
  const window = resolveCalendarWindow({
    view,
    from: anchor,
    to: parseCalendarTimestamp(params.to),
  })

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <ResourceToolbar
        title="Calendar"
        primaryLabel="Add event"
        primaryHref="/calendar/events/new"
        primaryVariant="info"
        refresh
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href={calendarNavHref({
              view,
              anchor: window.anchor,
              project,
              direction: 'previous',
            })}
            aria-label="Previous period"
            className={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
          >
            <span aria-hidden="true">‹</span>
          </Link>
          <Link
            href={calendarNavHref({
              view,
              anchor: window.anchor,
              project,
              direction: 'next',
            })}
            aria-label="Next period"
            className={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
          >
            <span aria-hidden="true">›</span>
          </Link>
          <Link
            href={calendarNavHref({
              view,
              anchor: window.anchor,
              project,
              direction: 'today',
            })}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Today
          </Link>
          <h2 className="ml-1 text-lg font-semibold">
            {calendarWindowLabel(view, window)}
          </h2>
        </div>

        <div className="flex items-center gap-1" role="group" aria-label="View">
          {CALENDAR_VIEWS.map((option) => (
            <Link
              key={option}
              href={calendarHref({ view: option, from: window.anchor, project })}
              aria-current={option === view ? 'page' : undefined}
              className={buttonVariants({
                variant: option === view ? 'default' : 'outline',
                size: 'sm',
              })}
            >
              {VIEW_LABELS[option]}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <CalendarLegend />
      </div>

      <Suspense fallback={<CalendarGridSkeleton />}>
        <CalendarData
          orgId={orgId}
          view={view}
          window={window}
          project={project}
          today={calendarTodayUtc()}
        />
      </Suspense>
    </div>
  )
}
