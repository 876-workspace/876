import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { loadMemberLabels } from '@/features/projects/member-labels'
import { projects } from '@/lib/clients/projects'
import { listProjectMilestones } from '@/lib/work-structure-data'
import { EventForm } from './event-form'
import type { EventFormOptions } from '@/types/events'

async function loadEventFormOptions(orgId: string): Promise<{
  options: EventFormOptions
  error: AppErrorValue | null
}> {
  const [projectList, issueList, members] = await Promise.all([
    projects.projects.list(orgId, { limit: 100 }),
    projects.issues.list(orgId, { limit: 100, order: 'updated' }),
    loadMemberLabels(orgId),
  ])
  const projectItems = projectList.data?.data ?? []
  const milestoneResults = await listProjectMilestones(orgId, projectItems)
  const error =
    [
      projectList.error,
      issueList.error,
      members.error,
      ...milestoneResults.map((result) => result.error),
    ].find(Boolean) ?? null

  return {
    error,
    options: {
      projects: projectItems,
      phases: milestoneResults.flatMap((result) => result.data?.data ?? []),
      workItems: (issueList.data?.data ?? []).map((issue) => ({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
      })),
      members: Object.entries(members.labels).map(([userId, name]) => ({
        userId,
        name,
      })),
    },
  }
}

export async function NewEventData({ orgId }: { orgId: string }) {
  const { options, error } = await loadEventFormOptions(orgId)

  return (
    <div className="space-y-4">
      {error ? (
        <AppError
          title="Some event options could not be loaded"
          error={error}
          variant="banner"
        />
      ) : null}
      <EventForm mode="create" options={options} />
    </div>
  )
}

export async function EditEventData({
  orgId,
  eventId,
}: {
  orgId: string
  eventId: string
}) {
  const eventResult = await projects.events.retrieve(orgId, eventId)
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

  const { options, error } = await loadEventFormOptions(orgId)

  return (
    <div className="space-y-4">
      {error ? (
        <AppError
          title="Some event options could not be loaded"
          error={error}
          variant="banner"
        />
      ) : null}
      <EventForm mode="edit" event={eventResult.data} options={options} />
    </div>
  )
}
