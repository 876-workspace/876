import { getError, isError } from '@876/core'
import type {
  CreateWorkTaskListInput,
  UpdateWorkTaskListInput,
  WorkTaskList,
} from '@876/work'

import * as tenants from '../tenants/index.js'
import * as repository from './task-lists.repository.js'

type Row = NonNullable<Awaited<ReturnType<typeof repository.retrieve>>>

function stamp(value: Date) {
  return Math.floor(value.getTime() / 1000)
}

function serialize(row: Row, organizationId: string): WorkTaskList {
  return {
    object: 'task_list',
    id: row.id,
    organizationId,
    name: row.name,
    description: row.description,
    ownerUserId: row.ownerUserId,
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
    createdBy: row.createdBy,
    createdAt: stamp(row.createdAt),
    updatedAt: stamp(row.updatedAt),
  }
}

async function requireTenant(organizationId: string) {
  const tenant = await tenants.retrieveByOrganization(organizationId)
  if (!tenant) return getError('work/tenant-not-found')
  if (tenant.status !== 'ACTIVE') return getError('work/tenant-inactive')
  return tenant
}

export async function ensureDefault(
  organizationId: string,
  createdBy: string
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const row = await repository.ensureDefault(tenant.id, createdBy)
  return serialize(row, organizationId)
}

export async function list(
  organizationId: string,
  filter: {
    ownerUserId?: string
    limit?: number
    startingAfter?: string
    endingBefore?: string
  } = {}
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant

  const limit = filter.limit ?? 25
  const rows = await repository.list(tenant.id, {
    ...(filter.ownerUserId ? { ownerUserId: filter.ownerUserId } : {}),
    limit,
    ...(filter.startingAfter ? { startingAfter: filter.startingAfter } : {}),
    ...(filter.endingBefore ? { endingBefore: filter.endingBefore } : {}),
  })
  const page = rows.slice(0, limit)

  return {
    data: (filter.endingBefore ? page.reverse() : page).map((row) =>
      serialize(row, organizationId)
    ),
    hasMore: rows.length > limit,
  }
}

export async function retrieve(organizationId: string, listId: string) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const row = await repository.retrieve(tenant.id, listId)
  return row ? serialize(row, organizationId) : null
}

export async function create(
  organizationId: string,
  input: CreateWorkTaskListInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const row = await repository.create({
    tenantId: tenant.id,
    name: input.name,
    description: input.description ?? null,
    ownerUserId: input.ownerUserId ?? null,
    isDefault: false,
    sortOrder: input.sortOrder ?? 0,
    createdBy: input.createdBy,
  })
  return serialize(row, organizationId)
}

export async function update(
  organizationId: string,
  listId: string,
  input: UpdateWorkTaskListInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const current = await repository.retrieve(tenant.id, listId)
  if (!current) return null

  const row = await repository.update(listId, {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.description === undefined
      ? {}
      : { description: input.description }),
    ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
  })
  return serialize(row, organizationId)
}

export async function remove(
  organizationId: string,
  listId: string,
  deletedBy: string
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const current = await repository.retrieve(tenant.id, listId)
  if (!current) return null
  if (current.isDefault) return getError('work/invalid-request')
  return repository.remove(listId, deletedBy)
}
