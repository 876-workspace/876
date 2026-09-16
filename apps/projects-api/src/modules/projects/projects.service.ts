import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import {
  nowUnixSeconds,
  nullableToDbUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import * as customFields from '../custom-fields/index.js'
import * as layouts from '../layouts/index.js'
import * as tenants from '../tenants/index.js'
import { resolveOwnedWorkItemType } from '../work-structure/work-item-type-access.js'
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

export function isValidProjectKey(key: string): boolean {
  return KEY_REGEX.test(key)
}

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

async function validateDefaultWorkItemType(
  tenantId: string,
  id: string | null | undefined
): Promise<ProjectsError | null> {
  if (id === undefined || id === null) return null
  return (await resolveOwnedWorkItemType(tenantId, id))
    ? null
    : getError('projects/work-item-type-not-found')
}

function projectLayoutIncoming(body: CreateProjectBody | UpdateProjectBody) {
  const incoming: layouts.LayoutFieldInput = {}
  if (body.name !== undefined) incoming.title = body.name
  if (body.description !== undefined) incoming.description = body.description
  if (body.status !== undefined) incoming.state = body.status
  if (body.startDate !== undefined) incoming.startDate = body.startDate
  if (body.targetDate !== undefined) incoming.dueDate = body.targetDate
  return incoming
}

function projectLayoutExisting(project: {
  name: string
  description: string | null
  status: string
  startDate: bigint | number | null
  targetDate: bigint | number | null
}) {
  return {
    title: project.name,
    description: project.description,
    state: project.status,
    startDate:
      project.startDate === null || project.startDate === undefined
        ? null
        : Number(project.startDate),
    dueDate:
      project.targetDate === null || project.targetDate === undefined
        ? null
        : Number(project.targetDate),
  } satisfies layouts.LayoutFieldInput
}

async function projectLayoutExistingValues(
  tenantId: string,
  projectId: string
): Promise<layouts.LayoutFieldInput> {
  const values = await customFields.listCustomFieldValuesForTenant(
    tenantId,
    projectId
  )
  const existing: layouts.LayoutFieldInput = {}
  for (const value of values) existing[`cf:${value.fieldKey}`] = value.value
  return existing
}

async function attachCustomFields(
  tenantId: string,
  rows: ProjectRow[]
): Promise<Map<string, customFields.SerializedProjectCustomFieldValue[]>> {
  if (rows.length === 0) return new Map()
  return customFields.listCustomFieldValuesForProjects(
    tenantId,
    rows.map((row) => row.id)
  )
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
    if (project) return project
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
  const totalCount = await repository.count(tenant.id, {
    status: query.status,
    lead: query.lead,
    q: query.q,
    includeArchived,
  })

  const valuesByProject = await attachCustomFields(tenant.id, pagedRows)
  return {
    data: {
      items: pagedRows.map((row) =>
        serializeProject(row, undefined, valuesByProject.get(row.id) ?? [])
      ),
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

  const defaultTypeError = await validateDefaultWorkItemType(
    tenant.id,
    body.defaultWorkItemTypeId
  )
  if (defaultTypeError) return { data: null, error: defaultTypeError }

  const layoutCheck = await layouts.enforceLayoutRules({
    organizationId,
    entity: 'project',
    existing: {},
    incoming: projectLayoutIncoming(body),
  })
  if (layoutCheck.error) return { data: null, error: layoutCheck.error }

  let key: string
  if (body.key !== undefined) {
    if (!KEY_REGEX.test(body.key))
      return { data: null, error: getError('projects/invalid-project-key') }
    const existingKey = await repository.retrieveByKey(tenant.id, body.key)
    if (existingKey)
      return { data: null, error: getError('projects/project-key-taken') }
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
    defaultWorkItemTypeId: body.defaultWorkItemTypeId ?? null,
    position: body.position ?? 0,
    createdAt: now,
    updatedAt: now,
  })

  return { data: serializeProject(created, 0, []), error: null }
}

export async function retrieve(
  organizationId: string,
  projectId: string
): Promise<ServiceResult<SerializedProject>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error !== null) return { data: null, error: resolved.error }
  const row = await repository.retrieve(resolved.tenant.id, projectId)
  if (!row)
    return { data: null, error: getError('projects/project-not-found') }
  const values = await customFields.listCustomFieldValuesForTenant(
    resolved.tenant.id,
    row.id
  )
  return { data: serializeProject(row, undefined, values), error: null }
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
  if (!existing)
    return { data: null, error: getError('projects/project-not-found') }

  const defaultTypeError = await validateDefaultWorkItemType(
    tenant.id,
    body.defaultWorkItemTypeId
  )
  if (defaultTypeError) return { data: null, error: defaultTypeError }

  if (body.key !== undefined) {
    if (!KEY_REGEX.test(body.key))
      return { data: null, error: getError('projects/invalid-project-key') }
    const colliding = await repository.retrieveByKey(tenant.id, body.key)
    if (colliding && colliding.id !== projectId)
      return { data: null, error: getError('projects/project-key-taken') }
  }

  const layoutCheck = await layouts.enforceLayoutRules({
    organizationId,
    entity: 'project',
    existing: {
      ...projectLayoutExisting(existing),
      ...(await projectLayoutExistingValues(tenant.id, projectId)),
    },
    incoming: projectLayoutIncoming(body),
  })
  if (layoutCheck.error) return { data: null, error: layoutCheck.error }

  const updatedParams: Parameters<typeof repository.update>[2] = {
    updatedAt: toDbUnixSeconds(nowUnixSeconds()),
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
  if (body.defaultWorkItemTypeId !== undefined)
    updatedParams.defaultWorkItemTypeId = body.defaultWorkItemTypeId
  if (body.position !== undefined) updatedParams.position = body.position

  const updated = await repository.update(tenant.id, projectId, updatedParams)
  const values = await customFields.listCustomFieldValuesForTenant(
    tenant.id,
    updated.id
  )
  return { data: serializeProject(updated, undefined, values), error: null }
}

export async function remove(
  organizationId: string,
  projectId: string
): Promise<ServiceResult<SerializedProjectTombstone>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error !== null) return { data: null, error: resolved.error }
  const tenant = resolved.tenant

  const existing = await repository.retrieve(tenant.id, projectId)
  if (!existing)
    return { data: null, error: getError('projects/project-not-found') }

  if (process.env.DELETION_MODE === 'hard')
    await repository.hardDelete(tenant.id, projectId)
  else
    await repository.archive(
      tenant.id,
      projectId,
      toDbUnixSeconds(nowUnixSeconds())
    )

  return {
    data: { object: 'projects.project', id: projectId, deleted: true },
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
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }

  return {
    data: (await repository.listMembers(projectId)).map(serializeMember),
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
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }

  const existingMember = await repository.retrieveMember(
    projectId,
    input.userId
  )
  if (existingMember)
    return { data: null, error: getError('projects/member-exists') }

  const member = await repository.createMember({
    id: generateId('projectMember'),
    projectId,
    userId: input.userId,
    role: input.role ?? 'member',
    createdAt: toDbUnixSeconds(nowUnixSeconds()),
  })

  return { data: serializeMember(member), error: null }
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
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }

  const existingMember = await repository.retrieveMember(projectId, userId)
  if (!existingMember)
    return { data: null, error: getError('projects/member-not-found') }

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
