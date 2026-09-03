import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import {
  nowUnixSeconds,
  nullableToDbUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import * as tenants from '../tenants/index.js'
import * as repository from './projects.repository.js'
import type {
  CreateProjectBody,
  ListProjectsQuery,
  UpdateProjectBody,
} from './projects.schemas.js'
import {
  serializeMember,
  serializeProject,
  type ProjectRow,
  type SerializedProject,
  type SerializedProjectMember,
  type SerializedProjectMemberTombstone,
  type SerializedProjectTombstone,
} from './projects.serializers.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

export type PaginatedProjects = {
  items: SerializedProject[]
  hasMore: boolean
  totalCount: number | null
}

const KEY_REGEX = /^[A-Z0-9]{2,10}$/

export function deriveKeyBase(name: string): string {
  const cleaned = name.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const base = cleaned.slice(0, 6)
  if (base.length >= 2) return base
  return (base + 'PRJ').slice(0, 6)
}

export async function deriveUniqueKey(
  tenantId: string,
  name: string
): Promise<string> {
  const base = deriveKeyBase(name)
  let candidate = base
  let suffix = 2

  while (await repository.retrieveByKey(tenantId, candidate)) {
    const suffixStr = String(suffix)
    const prefixLength = Math.min(base.length, 10 - suffixStr.length)
    candidate = `${base.slice(0, prefixLength)}${suffixStr}`
    suffix++
  }

  return candidate
}

export function deriveSlugBase(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'project'
  )
}

export async function deriveUniqueSlug(
  tenantId: string,
  name: string
): Promise<string> {
  const base = deriveSlugBase(name)
  let candidate = base
  let suffix = 2

  while (await repository.retrieveBySlug(tenantId, candidate)) {
    candidate = `${base}-${suffix}`
    suffix++
  }

  return candidate
}

async function resolveTenant(organizationId: string): Promise<
  | {
      tenant: NonNullable<Awaited<ReturnType<typeof tenants.resolveTenant>>>
      error: null
    }
  | { tenant: null; error: ProjectsError }
> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant) {
    return { tenant: null, error: getError('projects/tenant-not-found') }
  }
  return { tenant, error: null }
}

/**
 * Resolves a project row for another module by id or key.
 *
 * Sibling modules scope work to a project and need the row rather than the
 * serialized resource. This is the projects module's public way to hand it
 * over: a module owns its own tables, so nothing outside this directory may
 * reach for `projects.repository`.
 */
export async function resolveProject(
  tenantId: string,
  projectIdOrKey: string
): Promise<ProjectRow | null> {
  if (projectIdOrKey.startsWith('prj_')) {
    const project = await repository.retrieve(tenantId, projectIdOrKey)
    if (project) {
      return project
    }
  }

  return repository.retrieveByKey(tenantId, projectIdOrKey.toUpperCase())
}

export async function list(
  organizationId: string,
  query: ListProjectsQuery
): Promise<ServiceResult<PaginatedProjects>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error !== null) return { data: null, error: resolved.error }
  const tenant = resolved.tenant

  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100)
  const includeArchived = query.include_archived === 'true'

  const options: repository.ListProjectsOptions = {
    status: query.status,
    lead: query.lead,
    q: query.q,
    includeArchived,
    limit,
    startingAfter: query.starting_after,
    endingBefore: query.ending_before,
  }

  const rows = await repository.list(tenant.id, options)
  const hasMore = rows.length > limit
  const pagedRows = hasMore ? rows.slice(0, limit) : rows

  const countOptions: repository.CountProjectsOptions = {
    status: query.status,
    lead: query.lead,
    q: query.q,
    includeArchived,
  }
  const totalCount = await repository.count(tenant.id, countOptions)

  return {
    data: {
      items: pagedRows.map((row) => serializeProject(row)),
      hasMore,
      totalCount,
    },
    error: null,
  }
}

export async function create(
  organizationId: string,
  body: CreateProjectBody
): Promise<ServiceResult<SerializedProject>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error !== null) return { data: null, error: resolved.error }
  const tenant = resolved.tenant

  let key: string
  if (body.key !== undefined) {
    if (!KEY_REGEX.test(body.key)) {
      return { data: null, error: getError('projects/invalid-project-key') }
    }
    const existingKey = await repository.retrieveByKey(tenant.id, body.key)
    if (existingKey) {
      return { data: null, error: getError('projects/project-key-taken') }
    }
    key = body.key
  } else {
    key = await deriveUniqueKey(tenant.id, body.name)
  }

  const slug = await deriveUniqueSlug(tenant.id, body.name)
  const now = toDbUnixSeconds(nowUnixSeconds())

  const created = await repository.create({
    id: generateId('project'),
    tenantId: tenant.id,
    name: body.name,
    key,
    slug,
    description: body.description ?? null,
    leadUserId: body.leadUserId ?? null,
    status: body.status ?? 'planned',
    health: body.health ?? 'on-track',
    startDate: nullableToDbUnixSeconds(body.startDate),
    targetDate: nullableToDbUnixSeconds(body.targetDate),
    nextIssueNumber: 1,
    customerId: body.customerId ?? null,
    position: body.position ?? 0,
    createdAt: now,
    updatedAt: now,
  })

  return {
    data: serializeProject(created, 0),
    error: null,
  }
}

export async function retrieve(
  organizationId: string,
  projectId: string
): Promise<ServiceResult<SerializedProject>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error !== null) return { data: null, error: resolved.error }
  const tenant = resolved.tenant

  const row = await repository.retrieve(tenant.id, projectId)
  if (!row) {
    return { data: null, error: getError('projects/project-not-found') }
  }

  return {
    data: serializeProject(row),
    error: null,
  }
}

export async function update(
  organizationId: string,
  projectId: string,
  body: UpdateProjectBody
): Promise<ServiceResult<SerializedProject>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error !== null) return { data: null, error: resolved.error }
  const tenant = resolved.tenant

  const existing = await repository.retrieve(tenant.id, projectId)
  if (!existing) {
    return { data: null, error: getError('projects/project-not-found') }
  }

  if (body.key !== undefined) {
    if (!KEY_REGEX.test(body.key)) {
      return { data: null, error: getError('projects/invalid-project-key') }
    }
    const colliding = await repository.retrieveByKey(tenant.id, body.key)
    if (colliding && colliding.id !== projectId) {
      return { data: null, error: getError('projects/project-key-taken') }
    }
  }

  const now = toDbUnixSeconds(nowUnixSeconds())

  const updatedParams: Parameters<typeof repository.update>[2] = {
    updatedAt: now,
  }
  if (body.name !== undefined) updatedParams.name = body.name
  if (body.key !== undefined) updatedParams.key = body.key
  if (body.description !== undefined)
    updatedParams.description = body.description
  if (body.leadUserId !== undefined) updatedParams.leadUserId = body.leadUserId
  if (body.status !== undefined) updatedParams.status = body.status
  if (body.health !== undefined) updatedParams.health = body.health
  if (body.startDate !== undefined)
    updatedParams.startDate = nullableToDbUnixSeconds(body.startDate)
  if (body.targetDate !== undefined)
    updatedParams.targetDate = nullableToDbUnixSeconds(body.targetDate)
  if (body.customerId !== undefined) updatedParams.customerId = body.customerId
  if (body.position !== undefined) updatedParams.position = body.position

  const updated = await repository.update(tenant.id, projectId, updatedParams)
  return {
    data: serializeProject(updated),
    error: null,
  }
}

export async function remove(
  organizationId: string,
  projectId: string
): Promise<ServiceResult<SerializedProjectTombstone>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error !== null) return { data: null, error: resolved.error }
  const tenant = resolved.tenant

  const existing = await repository.retrieve(tenant.id, projectId)
  if (!existing) {
    return { data: null, error: getError('projects/project-not-found') }
  }

  const hardDelete = process.env.DELETION_MODE === 'hard'
  if (hardDelete) {
    await repository.hardDelete(tenant.id, projectId)
  } else {
    const now = toDbUnixSeconds(nowUnixSeconds())
    await repository.archive(tenant.id, projectId, now)
  }

  return {
    data: {
      object: 'projects.project',
      id: projectId,
      deleted: true,
    },
    error: null,
  }
}

export async function listMembers(
  organizationId: string,
  projectId: string
): Promise<ServiceResult<SerializedProjectMember[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error !== null) return { data: null, error: resolved.error }
  const tenant = resolved.tenant

  const project = await repository.retrieve(tenant.id, projectId)
  if (!project) {
    return { data: null, error: getError('projects/project-not-found') }
  }

  const members = await repository.listMembers(projectId)
  return {
    data: members.map(serializeMember),
    error: null,
  }
}

export async function addMember(
  organizationId: string,
  projectId: string,
  input: { userId: string; role?: string }
): Promise<ServiceResult<SerializedProjectMember>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error !== null) return { data: null, error: resolved.error }
  const tenant = resolved.tenant

  const project = await repository.retrieve(tenant.id, projectId)
  if (!project) {
    return { data: null, error: getError('projects/project-not-found') }
  }

  const existingMember = await repository.retrieveMember(
    projectId,
    input.userId
  )
  if (existingMember) {
    return { data: null, error: getError('projects/member-exists') }
  }

  const now = toDbUnixSeconds(nowUnixSeconds())
  const member = await repository.createMember({
    id: generateId('projectMember'),
    projectId,
    userId: input.userId,
    role: input.role ?? 'member',
    createdAt: now,
  })

  return {
    data: serializeMember(member),
    error: null,
  }
}

export async function removeMember(
  organizationId: string,
  projectId: string,
  userId: string
): Promise<ServiceResult<SerializedProjectMemberTombstone>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error !== null) return { data: null, error: resolved.error }
  const tenant = resolved.tenant

  const project = await repository.retrieve(tenant.id, projectId)
  if (!project) {
    return { data: null, error: getError('projects/project-not-found') }
  }

  const existingMember = await repository.retrieveMember(projectId, userId)
  if (!existingMember) {
    return { data: null, error: getError('projects/member-not-found') }
  }

  await repository.removeMember(projectId, userId)
  return {
    data: {
      object: 'projects.project-member',
      id: existingMember.id,
      deleted: true,
    },
    error: null,
  }
}
