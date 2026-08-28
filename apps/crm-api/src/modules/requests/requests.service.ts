import { getError, isError } from '@876/core'
import type {
  CreateRequestInput,
  DeleteRequestInput,
  ListRequestsFilter,
  RequestIntakeContext,
  UpdateRequestInput,
} from '../../types/request.js'
import * as priorities from '../priorities/index.js'
import * as tenants from '../tenants/tenants.service.js'
import * as repository from './requests.repository.js'

async function requireTenant(organizationId: string) {
  const tenant = await tenants.retrieveByOrganization(organizationId)
  if (!tenant) return getError('crm/tenant-not-found')
  if (tenant.status !== 'ACTIVE') return getError('crm/tenant-inactive')
  return tenant
}

function serialize(
  request: NonNullable<Awaited<ReturnType<typeof repository.retrieve>>>
) {
  return {
    object: 'request' as const,
    id: request.id,
    tenantId: request.tenantId,
    customerId: request.customerId,
    number: request.number,
    subject: request.subject,
    categoryId: request.categoryId,
    subcategoryId: request.subcategoryId,
    status: request.status,
    priorityId: request.priorityId,
    priority: priorities.serialize(request.priority),
    source: request.source,
    teamId: request.teamId,
    assigneeId: request.assigneeId,
    ownerId: request.ownerId,
    requesterUserId: request.requesterUserId,
    requesterContactId: request.requesterContactId,
    createdBy: request.createdBy,
    resolvedAt: request.resolvedAt
      ? Math.floor(request.resolvedAt.getTime() / 1000)
      : null,
    closedAt: request.closedAt
      ? Math.floor(request.closedAt.getTime() / 1000)
      : null,
    createdAt: Math.floor(request.createdAt.getTime() / 1000),
    updatedAt: Math.floor(request.updatedAt.getTime() / 1000),
  }
}

export async function list(
  organizationId: string,
  filters?: ListRequestsFilter
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const requests = await repository.list(tenant.id, filters)
  return requests.map(serialize)
}

export async function retrieve(organizationId: string, id: string) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const request = await repository.retrieve(tenant.id, id)
  return request ? serialize(request) : null
}

export async function assertRouting(
  organizationId: string,
  routing: {
    categoryId?: string | null
    subcategoryId?: string | null
    teamId?: string | null
    priorityId?: string | null
  }
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant

  if (
    routing.categoryId &&
    !(await repository.categoryExists(tenant.id, routing.categoryId))
  )
    return getError('crm/category-not-found')

  const subcategory = routing.subcategoryId
    ? await repository.subcategoryExists(tenant.id, routing.subcategoryId)
    : null
  if (routing.subcategoryId && !subcategory)
    return getError('crm/subcategory-not-found')
  if (subcategory && subcategory.categoryId !== (routing.categoryId ?? null))
    return getError('crm/subcategory-category-mismatch')

  if (
    routing.teamId &&
    !(await repository.teamExists(tenant.id, routing.teamId))
  )
    return getError('crm/team-not-found')

  if (routing.priorityId) {
    const priority = await priorities.requireActiveForTenant(
      tenant.id,
      routing.priorityId
    )
    if (isError(priority)) return priority
  }

  return null
}

async function resolvePriority(
  tenantId: string,
  explicitPriorityId: string | undefined,
  categoryDefaultPriorityId: string | null | undefined,
  subcategoryDefaultPriorityId: string | null | undefined
) {
  const priorityId =
    explicitPriorityId ??
    subcategoryDefaultPriorityId ??
    categoryDefaultPriorityId

  if (priorityId)
    return priorities.requireActiveForTenant(tenantId, priorityId)

  const defaultPriority = await priorities.retrieveDefaultForTenant(tenantId)
  if (!defaultPriority) return getError('crm/priority-not-found')
  return defaultPriority
}

async function validateCreate(
  organizationId: string,
  input: CreateRequestInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant

  const customer = await repository.customerExists(tenant.id, input.customerId)
  if (!customer) return getError('crm/customer-not-found')

  const category = input.categoryId
    ? await repository.categoryExists(tenant.id, input.categoryId)
    : null
  if (input.categoryId && !category) return getError('crm/category-not-found')

  const subcategory = input.subcategoryId
    ? await repository.subcategoryExists(tenant.id, input.subcategoryId)
    : null
  if (input.subcategoryId && !subcategory)
    return getError('crm/subcategory-not-found')
  if (subcategory && subcategory.categoryId !== input.categoryId)
    return getError('crm/subcategory-category-mismatch')

  if (input.teamId && !(await repository.teamExists(tenant.id, input.teamId)))
    return getError('crm/team-not-found')

  const priority = await resolvePriority(
    tenant.id,
    input.priorityId,
    category?.defaultPriorityId,
    subcategory?.defaultPriorityId
  )
  if (isError(priority)) return priority

  const defaults = subcategory ?? category
  const effective = {
    ...input,
    priorityId: priority.id,
    ...(input.teamId === undefined && defaults?.defaultTeamId
      ? { teamId: defaults.defaultTeamId }
      : {}),
  }

  return { tenant, effective }
}

export async function create(
  organizationId: string,
  input: CreateRequestInput
) {
  const validated = await validateCreate(organizationId, input)
  if (isError(validated)) return validated
  return serialize(
    await repository.create({
      tenantId: validated.tenant.id,
      ...validated.effective,
    })
  )
}

export async function createFromIntake(
  organizationId: string,
  input: CreateRequestInput,
  intake: RequestIntakeContext
) {
  const validated = await validateCreate(organizationId, input)
  if (isError(validated)) return validated

  const result = await repository.createFromIntake(
    { tenantId: validated.tenant.id, ...validated.effective },
    intake
  )

  return {
    request: serialize(result.request),
    submission: result.submission,
  }
}

export async function update(
  organizationId: string,
  id: string,
  input: UpdateRequestInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const current = await repository.retrieve(tenant.id, id)
  if (!current) return null

  const resultingCategoryId =
    input.categoryId === undefined ? current.categoryId : input.categoryId
  if (
    input.categoryId &&
    !(await repository.categoryExists(tenant.id, input.categoryId))
  )
    return getError('crm/category-not-found')

  const subcategory = input.subcategoryId
    ? await repository.subcategoryExists(tenant.id, input.subcategoryId)
    : null
  if (input.subcategoryId && !subcategory)
    return getError('crm/subcategory-not-found')
  if (input.subcategoryId && subcategory?.categoryId !== resultingCategoryId)
    return getError('crm/subcategory-category-mismatch')

  if (input.teamId && !(await repository.teamExists(tenant.id, input.teamId)))
    return getError('crm/team-not-found')
  if (input.priorityId) {
    const priority = await priorities.requireActiveForTenant(
      tenant.id,
      input.priorityId
    )
    if (isError(priority)) return priority
  }

  const teamChanged =
    input.teamId !== undefined && input.teamId !== current.teamId
  const assigneeMustClear =
    teamChanged &&
    input.teamId &&
    current.assigneeId &&
    !(await repository.isTeamMember(
      tenant.id,
      input.teamId,
      current.assigneeId
    ))

  const now = new Date()
  const next = await repository.update(id, {
    ...input,
    ...(assigneeMustClear && input.assigneeId === undefined
      ? { assigneeId: null }
      : {}),
    ...(input.status === 'RESOLVED' && !current.resolvedAt
      ? { resolvedAt: now }
      : {}),
    ...(input.status && input.status !== 'RESOLVED' && current.resolvedAt
      ? { resolvedAt: null }
      : {}),
    ...(input.status === 'CLOSED' && !current.closedAt
      ? { closedAt: now }
      : {}),
    ...(input.status && input.status !== 'CLOSED' && current.closedAt
      ? { closedAt: null }
      : {}),
  })

  return serialize(next)
}

export async function remove(
  organizationId: string,
  id: string,
  input: DeleteRequestInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const current = await repository.retrieve(tenant.id, id)
  if (!current) return null
  return repository.remove({ id, ...input })
}
