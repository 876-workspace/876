import { getError, type ProjectsError } from '../../http/errors.js'
import * as projects from '../projects/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './activity.repository.js'
import type { ActivityQuery } from './activity.schemas.js'
import {
  encodeActivityCursor,
  serializeActivityItem,
  type SerializedActivityItem,
} from './activity.serializers.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

export type ActivityFeed = {
  object: 'projects.activity-feed'
  items: SerializedActivityItem[]
  nextCursor: string | null
  hasMore: boolean
}

export async function listProjectActivity(
  organizationId: string,
  projectIdOrKey: string,
  query: ActivityQuery
): Promise<ServiceResult<ActivityFeed>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const project = await projects.resolveProject(tenant.id, projectIdOrKey)
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }

  return listActivityForScope(tenant.id, project.id, query)
}

export async function listActivityForScope(
  tenantId: string,
  projectId: string | undefined,
  query: ActivityQuery
): Promise<ServiceResult<ActivityFeed>> {
  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100)
  const rows = await repository.listActivity(
    projectId ? { tenantId, projectId } : { tenantId },
    { limit, cursor: query.cursor }
  )
  const hasMore = rows.length > limit
  const paged = hasMore ? rows.slice(0, limit) : rows
  const items = paged.map(serializeActivityItem)
  const last = items[items.length - 1]
  return {
    data: {
      object: 'projects.activity-feed',
      items,
      nextCursor: hasMore && last ? encodeActivityCursor(last) : null,
      hasMore,
    },
    error: null,
  }
}
