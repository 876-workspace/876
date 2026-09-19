import { ActivityFeed } from '@876/projects-ui/collaboration/activity-feed'
import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { toUiActivityItem } from '../collaboration-mappers'
import { projects } from '@/lib/clients/projects'

const PAGE_LIMIT = 25
const GLOBAL_PROJECT_LIMIT = 20
const GLOBAL_PER_PROJECT_LIMIT = 10
const GLOBAL_MERGED_LIMIT = 50

function activityHrefs(base: string, projectId: string) {
  const record = `${base}/projects/${encodeURIComponent(projectId)}`
  return {
    project: `${base}/projects`,
    phase: `${base}/phases`,
    'work-item': `${base}/issues`,
    timesheet: `${base}/time`,
    'automation-run': `${base}/automation`,
    discussion: `${record}/discussions`,
    'wiki-page': `${record}/wiki`,
  } as const
}

/**
 * The data half of the project Activity tab, shared by every host.
 * Read-only: newest-first feed with cursor pagination, links resolved against
 * the host's Projects root. Operator labels are raw user ids.
 */
export async function ProjectActivityData({
  organizationId,
  base,
  projectId,
  cursor,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  projectId: string
  cursor?: string
}) {
  const [projectResult, activityResult] = await Promise.all([
    projects.projects.retrieve(organizationId, projectId),
    projects.activity.listProjectActivity(organizationId, projectId, {
      limit: PAGE_LIMIT,
      ...(cursor ? { cursor } : {}),
    }),
  ])

  if (projectResult.error?.code === 'projects/project-not-found') notFound()

  if (projectResult.error || !projectResult.data) {
    return (
      <AppError
        title="Project could not be loaded"
        error={projectResult.error}
        variant="banner"
        showCode
      />
    )
  }

  if (activityResult.error || !activityResult.data) {
    return (
      <AppError
        title="Activity could not be loaded"
        error={activityResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const items = activityResult.data.items.map(toUiActivityItem)
  const nextCursor = activityResult.data.nextCursor
  const recordHref = `${base}/projects/${encodeURIComponent(projectId)}/activity`
  const nextHref =
    activityResult.data.hasMore && nextCursor !== null
      ? `${recordHref}?cursor=${encodeURIComponent(nextCursor)}`
      : null

  return (
    <ActivityFeed
      items={items}
      hrefBases={{ ...activityHrefs(base, projectId) }}
      nextHref={nextHref}
    />
  )
}

/**
 * The data half of the global Activity section, shared by every host.
 * Read-only aggregation over the most recent projects: up to
 * `GLOBAL_PER_PROJECT_LIMIT` items per project, merged newest-first and
 * capped at `GLOBAL_MERGED_LIMIT`. No cursor pagination; the feed is a
 * snapshot across projects.
 */
export async function ActivityData({
  organizationId,
  base,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
}) {
  const projectsResult = await projects.projects.list(organizationId, {
    limit: GLOBAL_PROJECT_LIMIT,
  })

  if (projectsResult.error || !projectsResult.data) {
    return (
      <AppError
        title="Activity could not be loaded"
        error={projectsResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const listed = projectsResult.data.data
  const feeds = await Promise.all(
    listed.map((project) =>
      projects.activity
        .listProjectActivity(organizationId, project.id, {
          limit: GLOBAL_PER_PROJECT_LIMIT,
        })
        .then((result) => ({ project, result })),
    ),
  )

  const loadError =
    feeds.find((feed) => feed.result.error)?.result.error ?? null

  const merged = feeds
    .filter((feed) => feed.result.error === null && feed.result.data !== null)
    .flatMap((feed) =>
      (feed.result.data?.items ?? []).map((item) => ({
        item: toUiActivityItem(item),
        projectId: feed.project.id,
      })),
    )
    .sort((a, b) => b.item.createdAt - a.item.createdAt)
    .slice(0, GLOBAL_MERGED_LIMIT)

  return (
    <div className="space-y-3">
      {loadError ? (
        <AppError
          title="Some activity could not be loaded"
          error={loadError}
          variant="banner"
          showCode
        />
      ) : null}
      <ActivityFeed
        items={merged.map((entry) => entry.item)}
        hrefBases={{
          project: `${base}/projects`,
          phase: `${base}/phases`,
          'work-item': `${base}/issues`,
          timesheet: `${base}/time`,
          'automation-run': `${base}/automation`,
          discussion: `${base}/projects`,
          'wiki-page': `${base}/projects`,
        }}
        nextHref={null}
      />
    </div>
  )
}
