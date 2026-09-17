import { formatDate, formatDateTime } from '@876/core/timestamps'
import type {
  DueReminder,
  MyWorkIssue,
  ProjectEvent,
} from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Skeleton } from '@876/ui/skeleton'
import Link from 'next/link'

import { formatReminderTiming } from '@/features/projects/reminder-timing'
import { projects } from '@/lib/services/projects'

import type { MyWorkResult } from '@/types/issues'

/**
 * One request, three boundaries: the page starts this promise and hands the same
 * one to each section, so every section streams on its own without three calls.
 */
export function loadMyWork(
  orgId: string,
  userId: string
): Promise<MyWorkResult> {
  return projects.myWork.retrieve(orgId, userId)
}

export function MyWorkSectionSkeleton() {
  return <Skeleton className="h-16 w-full rounded-lg" />
}

/** A short statement of what is missing — no paragraph to read. */
function EmptySection({ title }: { title: string }) {
  return <p className="text-muted-foreground text-sm">{title}</p>
}

function SectionError({ error }: { error: AppErrorValue }) {
  return (
    <AppError
      title="This section could not be loaded"
      error={error}
      variant="banner"
    />
  )
}

export async function MyWorkIssues({
  myWork,
}: {
  myWork: Promise<MyWorkResult>
}) {
  const result = await myWork
  if (result.error) return <SectionError error={result.error} />

  const issues: MyWorkIssue[] = result.data.assignedIssues
  if (issues.length === 0)
    return <EmptySection title="No assigned work items" />

  return (
    <ul aria-label="Assigned work items" className="space-y-3">
      {issues.map((issue) => (
        <li
          key={issue.id}
          className="flex flex-wrap items-baseline gap-2 text-sm"
        >
          <Link
            href={`/issues/${encodeURIComponent(issue.identifier)}`}
            className="text-info font-medium hover:underline"
          >
            {issue.identifier}
          </Link>
          <span className="min-w-0 flex-1 truncate">{issue.title}</span>
          <span className="text-muted-foreground text-xs">
            {issue.dueDate === null
              ? issue.status
              : `Due ${formatDate(issue.dueDate)}`}
          </span>
        </li>
      ))}
    </ul>
  )
}

export async function MyWorkEvents({
  myWork,
}: {
  myWork: Promise<MyWorkResult>
}) {
  const result = await myWork
  if (result.error) return <SectionError error={result.error} />

  const events: ProjectEvent[] = result.data.upcomingEvents
  if (events.length === 0) return <EmptySection title="No upcoming events" />

  return (
    <ul aria-label="Upcoming events" className="space-y-3">
      {events.map((event) => (
        <li
          key={event.id}
          className="flex flex-wrap items-baseline gap-2 text-sm"
        >
          <Link
            href={`/calendar/events/${encodeURIComponent(event.id)}`}
            className="text-info font-medium hover:underline"
          >
            {event.title}
          </Link>
          <span className="text-muted-foreground text-xs">
            {event.allDay
              ? formatDate(event.startsAt)
              : formatDateTime(event.startsAt)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export async function MyWorkReminders({
  myWork,
}: {
  myWork: Promise<MyWorkResult>
}) {
  const result = await myWork
  if (result.error) return <SectionError error={result.error} />

  const reminders: DueReminder[] = result.data.dueReminders
  if (reminders.length === 0) return <EmptySection title="No reminders due" />

  return (
    <ul aria-label="Reminders due" className="space-y-3">
      {reminders.map((reminder) => (
        <li key={reminder.id} className="space-y-0.5 text-sm">
          <p>{formatReminderTiming(reminder)}</p>
          <p className="text-muted-foreground text-xs">
            {formatDateTime(reminder.dueAt)}
          </p>
        </li>
      ))}
    </ul>
  )
}
