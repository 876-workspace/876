import { getError, isError } from '@876/core'
import type {
  CreateRequestPriorityInput,
  DeleteRequestPriorityInput,
  ProvisionedRequestPriorityInput,
  RequestPriority,
  UpdateRequestPriorityInput,
} from '../../types/priority.js'
import { workClient } from '../../providers/work.js'
import * as tenants from '../tenants/tenants.service.js'
import * as repository from './priorities.repository.js'

type PriorityRow = NonNullable<Awaited<ReturnType<typeof repository.retrieve>>>

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'priority'
  )
}

async function requireTenant(organizationId: string) {
  const tenant = await tenants.retrieveByOrganization(organizationId)
  if (!tenant) return getError('crm/tenant-not-found')
  if (tenant.status !== 'ACTIVE') return getError('crm/tenant-inactive')
  return tenant
}

export function serialize(priority: PriorityRow): RequestPriority {
  return {
    object: 'request_priority',
    id: priority.id,
    tenantId: priority.tenantId,
    provisioningKey: priority.provisioningKey,
    name: priority.name,
    slug: priority.slug,
    description: priority.description,
    color: priority.color,
    icon: priority.icon,
    weight: priority.weight,
    sortOrder: priority.sortOrder,
    isDefault: priority.isDefault,
    isActive: priority.isActive,
    createdBy: priority.createdBy,
    createdAt: Math.floor(priority.createdAt.getTime() / 1000),
    updatedAt: Math.floor(priority.updatedAt.getTime() / 1000),
  }
}

export async function list(organizationId: string, active?: boolean) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const priorities = await repository.list(tenant.id, active)
  return priorities.map(serialize)
}

export async function retrieve(organizationId: string, priorityId: string) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const priority = await repository.retrieve(tenant.id, priorityId)
  return priority ? serialize(priority) : null
}

export async function create(
  organizationId: string,
  input: CreateRequestPriorityInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const currentDefault = await repository.retrieveDefault(tenant.id)
  const priority = await repository.create({
    tenantId: tenant.id,
    name: input.name,
    slug: slugify(input.name),
    description: input.description ?? null,
    color: input.color ?? null,
    icon: input.icon ?? null,
    weight: input.weight ?? 0,
    sortOrder: input.sortOrder ?? 0,
    isDefault: false,
    isActive: input.isActive ?? true,
    createdBy: input.createdBy,
  })

  if (input.isDefault || (!currentDefault && priority.isActive))
    return serialize(await repository.setDefault(tenant.id, priority.id))

  return serialize(priority)
}

export async function update(
  organizationId: string,
  priorityId: string,
  input: UpdateRequestPriorityInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const current = await repository.retrieve(tenant.id, priorityId)
  if (!current) return null

  if (current.isDefault && (input.isDefault === false || input.isActive === false))
    return getError('crm/priority-default-required')

  const next = await repository.update(priorityId, {
    ...input,
    ...(input.name === undefined ? {} : { slug: slugify(input.name) }),
    isDefault: input.isDefault === true ? false : input.isDefault,
  })

  if (input.isDefault === true)
    return serialize(await repository.setDefault(tenant.id, priorityId))

  return serialize(next)
}

export async function remove(
  organizationId: string,
  priorityId: string,
  input: DeleteRequestPriorityInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const priority = await repository.retrieve(tenant.id, priorityId)
  if (!priority) return null
  if (priority.isDefault) return getError('crm/priority-default-required')
  if (await repository.isReferenced(tenant.id, priorityId))
    return getError('crm/priority-in-use')

  // New CRM tasks are canonical Work records. Fail closed if Work cannot prove
  // the priority is unused; deleting a referenced reporting dimension is worse
  // than temporarily refusing the archive/delete operation.
  const workTasks = await workClient().tasks.list(organizationId, { priorityId })
  if (workTasks.error) return getError('crm/work-unavailable')
  if (workTasks.data.data.length > 0) return getError('crm/priority-in-use')

  return repository.remove(priorityId, input.deletedBy)
}

export async function retrieveForTenant(tenantId: string, priorityId: string) {
  const priority = await repository.retrieve(tenantId, priorityId)
  return priority ? serialize(priority) : null
}

export async function retrieveActiveForTenant(tenantId: string, priorityId: string) {
  return repository.retrieveActive(tenantId, priorityId)
}

export async function retrieveDefaultForTenant(tenantId: string) {
  return repository.retrieveDefault(tenantId)
}

export async function requireActiveForTenant(tenantId: string, priorityId: string) {
  const priority = await repository.retrieveActive(tenantId, priorityId)
  if (!priority) return getError('crm/priority-not-found')
  return priority
}

export async function ensureProvisioned(
  tenantId: string,
  input: ProvisionedRequestPriorityInput
) {
  const existing = await repository.retrieveByProvisioningKey(
    tenantId,
    input.provisioningKey
  )
  if (existing) return existing

  const currentDefault = await repository.retrieveDefault(tenantId)
  const created = await repository.create({
    tenantId,
    provisioningKey: input.provisioningKey,
    name: input.name,
    slug: slugify(input.name),
    description: input.description,
    color: input.color,
    icon: input.icon,
    weight: input.weight,
    sortOrder: input.sortOrder,
    isDefault: false,
    isActive: true,
    createdBy: null,
  })

  if (!currentDefault && input.isDefault)
    return repository.setDefault(tenantId, created.id)

  return created
}
