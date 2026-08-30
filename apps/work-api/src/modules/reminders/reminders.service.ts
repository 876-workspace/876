import { getError, isError } from '@876/core'
import type {
  CreateWorkReminderInput,
  UpdateWorkReminderInput,
  WorkContext,
  WorkReminder,
} from '@876/work'

import * as tenants from '../tenants/index.js'
import * as repository from './reminders.repository.js'

type ReminderRow = Awaited<ReturnType<typeof repository.list>>[number]

type ListReminderFilter = {
  context?: WorkContext
  userId?: string
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

function fromUnixSeconds(seconds: number) {
  return new Date(seconds * 1000)
}

function serializeTimestamp(date: Date | null) {
  return date ? Math.floor(date.getTime() / 1000) : null
}

function serialize(
  reminder: ReminderRow,
  organizationId: string
): WorkReminder {
  const hasContext =
    reminder.contextService !== null &&
    reminder.contextResource !== null &&
    reminder.contextId !== null
  return {
    object: 'reminder',
    id: reminder.id,
    organizationId,
    context: hasContext
      ? {
          service: reminder.contextService!,
          resource: reminder.contextResource!,
          id: reminder.contextId!,
        }
      : null,
    title: reminder.title,
    note: reminder.note,
    remindAt: serializeTimestamp(reminder.remindAt)!,
    userId: reminder.userId,
    status: reminder.status,
    sentAt: serializeTimestamp(reminder.sentAt),
    dismissedAt: serializeTimestamp(reminder.dismissedAt),
    createdBy: reminder.createdBy,
    createdAt: serializeTimestamp(reminder.createdAt)!,
    updatedAt: serializeTimestamp(reminder.updatedAt)!,
  }
}

async function requireTenant(organizationId: string) {
  const tenant = await tenants.retrieveByOrganization(organizationId)
  if (!tenant) return getError('work/tenant-not-found')
  if (tenant.status !== 'ACTIVE') return getError('work/tenant-inactive')
  return tenant
}

function contextColumns(context?: WorkContext | null) {
  if (!context)
    return { contextService: null, contextResource: null, contextId: null }
  return {
    contextService: context.service,
    contextResource: context.resource,
    contextId: context.id,
  }
}

export async function list(
  organizationId: string,
  filter: ListReminderFilter = {}
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const limit = filter.limit ?? 25
  const rows = await repository.list(tenant.id, {
    ...(filter.context
      ? {
          contextService: filter.context.service,
          contextResource: filter.context.resource,
          contextId: filter.context.id,
        }
      : {}),
    ...(filter.userId ? { userId: filter.userId } : {}),
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

export async function retrieve(organizationId: string, reminderId: string) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const row = await repository.retrieve(tenant.id, reminderId)
  return row ? serialize(row, organizationId) : null
}

export async function create(
  organizationId: string,
  input: CreateWorkReminderInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const row = await repository.create({
    tenantId: tenant.id,
    ...contextColumns(input.context),
    title: input.title,
    note: input.note ?? null,
    remindAt: fromUnixSeconds(input.remindAt),
    userId: input.userId,
    status: input.status ?? 'SCHEDULED',
    sentAt: null,
    dismissedAt: null,
    createdBy: input.createdBy,
  })
  return serialize(row, organizationId)
}

export async function update(
  organizationId: string,
  reminderId: string,
  input: UpdateWorkReminderInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const current = await repository.retrieve(tenant.id, reminderId)
  if (!current) return null
  const row = await repository.update(reminderId, {
    ...(input.context === undefined ? {} : contextColumns(input.context)),
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.note === undefined ? {} : { note: input.note }),
    ...(input.remindAt === undefined
      ? {}
      : { remindAt: fromUnixSeconds(input.remindAt) }),
    ...(input.userId === undefined ? {} : { userId: input.userId }),
    ...(input.status === undefined ? {} : { status: input.status }),
  })
  return serialize(row, organizationId)
}

export async function remove(
  organizationId: string,
  reminderId: string,
  deletedBy: string
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const current = await repository.retrieve(tenant.id, reminderId)
  if (!current) return null
  return repository.remove(reminderId, deletedBy)
}
