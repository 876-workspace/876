import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { nowUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
import * as automation from '../automation/index.js'
import * as projects from '../projects/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './client-grants.repository.js'
import type {
  InviteGrantBody,
  ListGrantsQuery,
  UpdateGrantBody,
} from './client-grants.schemas.js'
import {
  serializeClientGrant,
  type ClientGrantRow,
  type SerializedClientGrant,
} from './client-grants.serializers.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

export type PaginatedClientGrants = {
  items: SerializedClientGrant[]
  hasMore: boolean
  totalCount: number | null
}

function now() {
  return toDbUnixSeconds(nowUnixSeconds())
}

async function resolveProject(tenantId: string, projectIdOrKey: string) {
  const project = await projects.resolveProject(tenantId, projectIdOrKey)
  if (!project)
    return { project: null, error: getError('projects/project-not-found') }
  return { project, error: null }
}

function flagsFrom(
  body: InviteGrantBody | UpdateGrantBody
): Pick<
  ClientGrantRow,
  | 'allowComments'
  | 'allowDiscussions'
  | 'allowFiles'
  | 'allowTime'
  | 'allowInvoices'
  | 'allowWiki'
> {
  return {
    allowComments: body.allowComments ?? true,
    allowDiscussions: body.allowDiscussions ?? true,
    allowFiles: body.allowFiles ?? true,
    allowTime: body.allowTime ?? true,
    allowInvoices: body.allowInvoices ?? true,
    allowWiki: body.allowWiki ?? true,
  }
}

export async function listGrants(
  organizationId: string,
  projectIdOrKey: string,
  query: ListGrantsQuery
): Promise<ServiceResult<PaginatedClientGrants>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100)
  const rows = await repository.listGrants(
    tenant.id,
    projectResolution.project.id,
    {
      limit,
      startingAfter: query.starting_after,
      includeRevoked: query.include_revoked === 'true',
    }
  )
  const hasMore = rows.length > limit
  const paged = hasMore ? rows.slice(0, limit) : rows
  return {
    data: {
      items: paged.map(serializeClientGrant),
      hasMore,
      totalCount: null,
    },
    error: null,
  }
}

export async function inviteGrant(
  organizationId: string,
  projectIdOrKey: string,
  body: InviteGrantBody
): Promise<ServiceResult<SerializedClientGrant>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }
  const project = projectResolution.project

  const existing = await repository.findGrantForUser(
    tenant.id,
    project.id,
    body.userId
  )
  if (existing && existing.revokedAt === null)
    return { data: null, error: getError('projects/client-grant-exists') }

  const timestamp = now()
  const flags = flagsFrom(body)
  const row = existing
    ? await repository.updateGrant(existing.id, {
        ...flags,
        revokedAt: null,
        updatedAt: timestamp,
      })
    : await repository.createGrant({
        id: generateId('clientGrant'),
        tenantId: tenant.id,
        projectId: project.id,
        userId: body.userId,
        ...flags,
        invitedBy: body.invitedBy ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      })

  await automation.createNotificationRecord(tenant.id, {
    userId: body.userId,
    kind: 'client-grant-invite',
    title: `You were invited to view ${project.name}`,
    subjectType: 'project',
    subjectId: project.id,
  })

  return { data: serializeClientGrant(row), error: null }
}

export async function retrieveGrant(
  organizationId: string,
  projectIdOrKey: string,
  grantId: string
): Promise<ServiceResult<SerializedClientGrant>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const row = await repository.retrieveGrant(
    tenant.id,
    projectResolution.project.id,
    grantId
  )
  if (!row)
    return { data: null, error: getError('projects/client-grant-not-found') }
  return { data: serializeClientGrant(row), error: null }
}

export async function updateGrant(
  organizationId: string,
  projectIdOrKey: string,
  grantId: string,
  body: UpdateGrantBody
): Promise<ServiceResult<SerializedClientGrant>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const existing = await repository.retrieveGrant(
    tenant.id,
    projectResolution.project.id,
    grantId
  )
  if (!existing)
    return { data: null, error: getError('projects/client-grant-not-found') }

  const updated = await repository.updateGrant(existing.id, {
    ...(body.allowComments !== undefined
      ? { allowComments: body.allowComments }
      : {}),
    ...(body.allowDiscussions !== undefined
      ? { allowDiscussions: body.allowDiscussions }
      : {}),
    ...(body.allowFiles !== undefined ? { allowFiles: body.allowFiles } : {}),
    ...(body.allowTime !== undefined ? { allowTime: body.allowTime } : {}),
    ...(body.allowInvoices !== undefined
      ? { allowInvoices: body.allowInvoices }
      : {}),
    ...(body.allowWiki !== undefined ? { allowWiki: body.allowWiki } : {}),
    updatedAt: now(),
  })
  return { data: serializeClientGrant(updated), error: null }
}

export async function revokeGrant(
  organizationId: string,
  projectIdOrKey: string,
  grantId: string
): Promise<ServiceResult<SerializedClientGrant>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const existing = await repository.retrieveGrant(
    tenant.id,
    projectResolution.project.id,
    grantId
  )
  if (!existing)
    return { data: null, error: getError('projects/client-grant-not-found') }

  const timestamp = now()
  const updated = await repository.updateGrant(existing.id, {
    revokedAt:
      existing.revokedAt === null || existing.revokedAt === undefined
        ? timestamp
        : BigInt(existing.revokedAt),
    updatedAt: timestamp,
  })
  return { data: serializeClientGrant(updated), error: null }
}
