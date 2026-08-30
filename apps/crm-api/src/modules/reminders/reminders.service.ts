import { getError, isError } from '@876/core'
import type { WorkReminder } from '@876/work'
import type {
  CreateReminderInput,
  RequestReminder,
  UpdateReminderInput,
} from '../../types/task.js'
import {
  crmRequestWorkContext,
  workClient,
  workErrorToCrm,
} from '../../providers/work.js'
import { requireRequestContext } from '../requests/index.js'

function serialize(
  reminder: WorkReminder,
  tenantId: string,
  requestId: string
): RequestReminder {
  return {
    object: 'request_reminder',
    id: reminder.id,
    tenantId,
    requestId,
    title: reminder.title,
    note: reminder.note,
    remindAt: reminder.remindAt,
    userId: reminder.userId,
    status: reminder.status,
    sentAt: reminder.sentAt,
    dismissedAt: reminder.dismissedAt,
    createdBy: reminder.createdBy,
    createdAt: reminder.createdAt,
    updatedAt: reminder.updatedAt,
  }
}

async function listWork(organizationId: string, requestId: string) {
  const reminders: WorkReminder[] = []
  let startingAfter: string | undefined

  for (let page = 0; page < 20; page += 1) {
    const result = await workClient().reminders.list(organizationId, {
      context: crmRequestWorkContext(requestId),
      ...(startingAfter ? { startingAfter } : {}),
    })
    if (result.error) return workErrorToCrm(result.error)

    reminders.push(...result.data.data)
    if (!result.data.has_more) return reminders
    const lastReminder = result.data.data.at(-1)
    if (!lastReminder) return getError('crm/work-invalid-response')
    startingAfter = lastReminder.id
  }

  return getError('crm/work-invalid-response')
}

async function findWorkReminder(
  organizationId: string,
  requestId: string,
  reminderId: string
) {
  const result = await workClient().reminders.retrieve(
    organizationId,
    reminderId
  )
  if (result.error?.code === 'work/reminder-not-found') return null
  if (result.error) return workErrorToCrm(result.error)
  const context = crmRequestWorkContext(requestId)
  return result.data.context?.service === context.service &&
    result.data.context?.resource === context.resource &&
    result.data.context?.id === context.id
    ? result.data
    : null
}

export async function list(organizationId: string, requestId: string) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const result = await listWork(organizationId, requestId)
  if (isError(result)) return result
  return result.map((reminder) =>
    serialize(reminder, context.tenantId, requestId)
  )
}

export async function create(
  organizationId: string,
  requestId: string,
  input: CreateReminderInput
) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const result = await workClient().reminders.create(organizationId, {
    context: crmRequestWorkContext(requestId),
    title: input.title,
    note: input.note ?? null,
    remindAt: input.remindAt,
    userId: input.userId,
    status: input.status,
    createdBy: input.createdBy,
  })
  if (result.error) return workErrorToCrm(result.error)
  return serialize(result.data, context.tenantId, requestId)
}

export async function update(
  organizationId: string,
  requestId: string,
  reminderId: string,
  input: UpdateReminderInput
) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const current = await findWorkReminder(organizationId, requestId, reminderId)
  if (isError(current)) return current
  if (!current) return null

  const result = await workClient().reminders.update(
    organizationId,
    reminderId,
    {
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.note === undefined ? {} : { note: input.note }),
      ...(input.remindAt === undefined ? {} : { remindAt: input.remindAt }),
      ...(input.userId === undefined ? {} : { userId: input.userId }),
      ...(input.status === undefined ? {} : { status: input.status }),
    }
  )
  if (result.error?.code === 'work/reminder-not-found') return null
  if (result.error) return workErrorToCrm(result.error)
  return serialize(result.data, context.tenantId, requestId)
}

export async function remove(
  organizationId: string,
  requestId: string,
  reminderId: string,
  deletedBy: string
) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const current = await findWorkReminder(organizationId, requestId, reminderId)
  if (isError(current)) return current
  if (!current) return null

  const result = await workClient().reminders.delete(
    organizationId,
    reminderId,
    deletedBy
  )
  if (result.error?.code === 'work/reminder-not-found') return null
  if (result.error) return workErrorToCrm(result.error)
  return {
    object: 'request_reminder' as const,
    id: reminderId,
    deleted: true as const,
  }
}
