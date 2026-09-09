import { getError, isError } from '@876/core'
import type {
  CreateWorkAlertInput,
  UpdateWorkAlertInput,
  WorkAlert,
} from '@876/work'

import * as events from '../events/index.js'
import * as tasks from '../tasks/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './alerts.repository.js'

type Row = Awaited<ReturnType<typeof repository.list>>[number]
function stamp(value: Date | null) {
  return value ? Math.floor(value.getTime() / 1000) : null
}
function serialize(row: Row, organizationId: string): WorkAlert {
  return {
    object: 'alert',
    id: row.id,
    organizationId,
    taskId: row.taskId,
    eventId: row.eventId,
    userId: row.userId,
    triggerType: row.triggerType,
    triggerAt: stamp(row.triggerAt),
    offsetSeconds: row.offsetSeconds,
    action: row.action,
    status: row.status,
    sentAt: stamp(row.sentAt),
    dismissedAt: stamp(row.dismissedAt),
    createdBy: row.createdBy,
    createdAt: stamp(row.createdAt)!,
    updatedAt: stamp(row.updatedAt)!,
  }
}
async function requireTenant(organizationId: string) {
  const tenant = await tenants.retrieveByOrganization(organizationId)
  if (!tenant) return getError('work/tenant-not-found')
  if (tenant.status !== 'ACTIVE') return getError('work/tenant-inactive')
  return tenant
}

async function requireAlertResource(
  organizationId: string,
  input: Pick<CreateWorkAlertInput, 'taskId' | 'eventId'>
) {
  if (input.taskId) {
    const task = await tasks.retrieve(organizationId, input.taskId)
    if (isError(task)) return task
    if (!task) return getError('work/task-not-found')
    return task
  }

  if (input.eventId) {
    const event = await events.retrieve(organizationId, input.eventId)
    if (isError(event)) return event
    if (!event) return getError('work/event-not-found')
    return event
  }

  return getError('work/invalid-request')
}

export async function list(
  organizationId: string,
  filter: {
    taskId?: string
    eventId?: string
    userId?: string
    status?: string
    limit?: number
    startingAfter?: string
    endingBefore?: string
  } = {}
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const limit = filter.limit ?? 25
  const rows = await repository.list(tenant.id, { ...filter, limit })
  const page = rows.slice(0, limit)
  return {
    data: (filter.endingBefore ? page.reverse() : page).map((row) =>
      serialize(row, organizationId)
    ),
    hasMore: rows.length > limit,
  }
}
export async function retrieve(organizationId: string, alertId: string) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const row = await repository.retrieve(tenant.id, alertId)
  return row ? serialize(row, organizationId) : null
}
export async function create(
  organizationId: string,
  input: CreateWorkAlertInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant

  const resource = await requireAlertResource(organizationId, input)
  if (isError(resource)) return resource

  const row = await repository.create({
    tenantId: tenant.id,
    taskId: input.taskId ?? null,
    eventId: input.eventId ?? null,
    userId: input.userId,
    triggerType: input.triggerType,
    triggerAt:
      input.triggerAt == null ? null : new Date(input.triggerAt * 1000),
    offsetSeconds: input.offsetSeconds ?? null,
    action: input.action ?? 'NOTIFICATION',
    status: 'SCHEDULED',
    sentAt: null,
    dismissedAt: null,
    createdBy: input.createdBy,
  })
  return serialize(row, organizationId)
}
export async function update(
  organizationId: string,
  alertId: string,
  input: UpdateWorkAlertInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const current = await repository.retrieve(tenant.id, alertId)
  if (!current) return null
  const nextStatus = input.status ?? current.status
  const row = await repository.update(alertId, {
    ...(input.triggerType === undefined
      ? {}
      : { triggerType: input.triggerType }),
    ...(input.triggerAt === undefined
      ? {}
      : {
          triggerAt:
            input.triggerAt == null ? null : new Date(input.triggerAt * 1000),
        }),
    ...(input.offsetSeconds === undefined
      ? {}
      : { offsetSeconds: input.offsetSeconds }),
    ...(input.action === undefined ? {} : { action: input.action }),
    ...(input.status === undefined ? {} : { status: input.status }),
    sentAt:
      nextStatus === 'SENT'
        ? (current.sentAt ?? new Date())
        : nextStatus === 'SCHEDULED'
          ? null
          : current.sentAt,
    dismissedAt:
      nextStatus === 'DISMISSED'
        ? (current.dismissedAt ?? new Date())
        : nextStatus === 'SCHEDULED'
          ? null
          : current.dismissedAt,
  })
  return serialize(row, organizationId)
}
export async function remove(organizationId: string, alertId: string) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  if (!(await repository.retrieve(tenant.id, alertId))) return null
  return repository.remove(alertId)
}
export const absoluteDue = repository.absoluteDue
export const relativeCandidates = repository.relativeCandidates
export const markSent = (alertId: string) =>
  repository.update(alertId, { status: 'SENT', sentAt: new Date() })
