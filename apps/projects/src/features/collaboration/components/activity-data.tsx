import { AppError } from '@876/ui/app-error'

import { loadMemberLabels } from '@/features/projects/member-labels'
import { projects } from '@/lib/services/projects'

import { mapActivityItem, type UiActivityItem } from '../mappers'
import { ActivityFeed } from './activity-feed'

const PAGE_LIMIT = 25

export async function ProjectActivityData({
  orgId,
  projectId,
  cursor,
}: {
  orgId: string
  projectId: string
  cursor?: string
}) {
  const [activityResult, membersResult] = await Promise.all([
    projects.activity.listProjectActivity(orgId, projectId, {
      limit: PAGE_LIMIT,
      ...(cursor ? { cursor } : {}),
    }),
    loadMemberLabels(orgId),
  ])
  if (activityResult.error || !activityResult.data)
    return (
      <AppError
        title="Activity could not be loaded"
        error={
          activityResult.error ?? {
            code: 'projects/activity-unavailable',
            message: 'Activity could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  const items = activityResult.data.items.map((item) =>
    mapActivityItem(item, membersResult.labels)
  )
  const nextCursor = activityResult.data.nextCursor
  const nextHref =
    activityResult.data.hasMore && nextCursor !== null
      ? `/projects/${encodeURIComponent(projectId)}/activity?cursor=${encodeURIComponent(nextCursor)}`
      : null

  return (
    <ActivityFeed
      items={items}
      hrefBases={{
        project: '/projects',
        phase: '/phases',
        'work-item': '/issues',
        timesheet: '/time',
        'automation-run': '/settings/automation',
        discussion: `/projects/${encodeURIComponent(projectId)}/discussions`,
        'wiki-page': `/projects/${encodeURIComponent(projectId)}/wiki`,
      }}
      nextHref={nextHref}
    />
  )
}

export async function GlobalActivityData({
  orgId,
  projects: projectIds,
}: {
  orgId: string
  projects: readonly { id: string; key: string }[]
}) {
  const [membersResult, ...feeds] = await Promise.all([
    loadMemberLabels(orgId),
    ...projectIds.map((project) =>
      projects.activity
        .listProjectActivity(orgId, project.id, { limit: 10 })
        .then((result) => ({ project, result }))
    ),
  ])
  const merged = feeds
    .filter((feed) => feed.result.error === null && feed.result.data !== null)
    .flatMap((feed) =>
      (feed.result.data?.items ?? []).map((item) => ({
        item: mapActivityItem(item, membersResult.labels),
        projectKey: feed.project.key,
      }))
    )
    .sort((a, b) => b.item.createdAt - a.item.createdAt)
    .slice(0, 50)

  const items: UiActivityItem[] = merged.map(({ item }) => item)
  return (
    <ActivityFeed
      items={items}
      hrefBases={{
        project: '/projects',
        phase: '/phases',
        'work-item': '/issues',
        timesheet: '/time',
        'automation-run': '/settings/automation',
        discussion: '/projects',
        'wiki-page': '/projects',
      }}
      nextHref={null}
    />
  )
}
