import { formatDate, formatDateTime } from '@876/core/timestamps'
import { AppError } from '@876/ui/app-error'
import { Skeleton } from '@876/ui/skeleton'
import type { ProjectEvent } from '@876/projects/contracts'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { EventActions } from '@/features/projects/components/event-actions'
import { EventAttendeesPanel } from '@/features/projects/components/event-attendees-panel'
import { RemindersData } from '@/features/projects/components/reminders-data'
import { describeRecurrence } from '@/features/projects/event-input'
import { loadMemberLabels } from '@/features/projects/member-labels'
import { projects } from '@/lib/services/projects'

function eventWindow(event: ProjectEvent) {
  const start = event.allDay
    ? formatDate(event.startsAt)
    : formatDateTime(event.startsAt)

  if (event.endsAt === null) return start
  if (event.allDay && formatDate(event.startsAt) === formatDate(event.endsAt))
    return `${formatDate(event.startsAt)} (all day)`

  return `${start} → ${formatDateTime(event.endsAt)}`
}

export async function EventDetailData({
  orgId,
  userId,
  eventId,
}: {
  orgId: string
  userId: string
  eventId: string
}) {
  const [eventResult, membersResult] = await Promise.all([
    projects.events.retrieve(orgId, eventId),
    loadMemberLabels(orgId),
  ])

  if (eventResult.error?.code === 'projects/event-not-found') notFound()
  if (eventResult.error || !eventResult.data)
    return (
      <AppError
        title="The event could not be loaded"
        error={
          eventResult.error ?? {
            code: 'projects/event-unavailable',
            message: 'The event could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  const event = eventResult.data
  const [phaseResult, issueResult, projectResult] = await Promise.all([
    event.milestoneId
      ? projects.milestones.retrieve(orgId, event.milestoneId)
      : Promise.resolve(null),
    event.issueId
      ? projects.issues.retrieve(orgId, event.issueId)
      : Promise.resolve(null),
    projects.projects.retrieve(orgId, event.projectId),
  ])

  const linkError =
    phaseResult?.error ?? issueResult?.error ?? projectResult.error ?? null
  const loadError = membersResult.error ?? linkError

  return (
    <div className="space-y-6">
      {loadError ? (
        <AppError
          title="Some event details could not be loaded"
          error={loadError}
          variant="banner"
        />
      ) : null}

      <section className="876-card space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="876-badge">
              {event.kind === 'meeting' ? 'Meeting' : 'Event'}
            </span>
            <h1 className="text-xl font-semibold">{event.title}</h1>
            <p className="text-muted-foreground text-sm">
              {eventWindow(event)}
            </p>
          </div>
          <EventActions eventId={event.id} />
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs font-medium">Project</dt>
            <dd>
              <Link
                href={`/projects/${encodeURIComponent(event.projectId)}`}
                className="text-info hover:underline"
              >
                {projectResult.data?.name ?? event.projectId}
              </Link>
            </dd>
          </div>
          {phaseResult?.data ? (
            <div>
              <dt className="text-muted-foreground text-xs font-medium">Phase</dt>
              <dd>
                <Link
                  href={`/phases/${encodeURIComponent(phaseResult.data.id)}`}
                  className="text-info hover:underline"
                >
                  {phaseResult.data.name}
                </Link>
              </dd>
            </div>
          ) : null}
          {issueResult?.data ? (
            <div>
              <dt className="text-muted-foreground text-xs font-medium">
                Work item
              </dt>
              <dd>
                <Link
                  href={`/issues/${encodeURIComponent(issueResult.data.identifier)}`}
                  className="text-info hover:underline"
                >
                  {issueResult.data.identifier}
                </Link>
                <span className="text-muted-foreground ml-2">
                  {issueResult.data.title}
                </span>
              </dd>
            </div>
          ) : null}
          {event.location ? (
            <div>
              <dt className="text-muted-foreground text-xs font-medium">
                Location
              </dt>
              <dd>{event.location}</dd>
            </div>
          ) : null}
          {event.meetingUrl ? (
            <div>
              <dt className="text-muted-foreground text-xs font-medium">
                Meeting URL
              </dt>
              <dd>
                <a
                  href={event.meetingUrl}
                  className="text-info break-all hover:underline"
                >
                  {event.meetingUrl}
                </a>
              </dd>
            </div>
          ) : null}
          {describeRecurrence(event.recurrence) ? (
            <div>
              <dt className="text-muted-foreground text-xs font-medium">
                Repeats
              </dt>
              <dd>{describeRecurrence(event.recurrence)}</dd>
            </div>
          ) : null}
        </dl>

        {event.description ? (
          <p className="text-sm whitespace-pre-wrap">{event.description}</p>
        ) : null}
      </section>

      <EventAttendeesPanel
        eventId={event.id}
        attendees={event.attendees}
        currentUserId={userId}
        memberNames={membersResult.labels}
      />

      <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
        <RemindersData
          orgId={orgId}
          userId={userId}
          target={{ eventId: event.id }}
          base="the start"
        />
      </Suspense>
    </div>
  )
}
