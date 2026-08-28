import type {
  CreateReminderInput,
  RequestReminder,
  UpdateReminderInput,
} from '../../types/task.js'
import { requireRequestContext } from '../requests/index.js'
import * as repository from './reminders.repository.js'

type ReminderRow = Awaited<ReturnType<typeof repository.list>>[number]

function fromUnixSeconds(seconds: number) {
  return new Date(seconds * 1000)
}

function serializeTimestamp(date: Date | null) {
  return date ? Math.floor(date.getTime() / 1000) : null
}

function serialize(reminder: ReminderRow): RequestReminder {
  return {
    object: 'request_reminder',
    id: reminder.id,
    tenantId: reminder.tenantId,
    requestId: reminder.requestId,
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

export async function list(organizationId: string, requestId: string) {
  const context = await requireRequestContext(organizationId, requestId)
  const reminders = await repository.list(context.tenantId, requestId)

  return reminders.map(serialize)
}

export async function create(
  organizationId: string,
  requestId: string,
  input: CreateReminderInput
) {
  const context = await requireRequestContext(organizationId, requestId)
  const reminder = await repository.create({
    tenantId: context.tenantId,
    requestId,
    ...input,
    remindAt: fromUnixSeconds(input.remindAt),
  })

  return serialize(reminder)
}

export async function update(
  organizationId: string,
  requestId: string,
  reminderId: string,
  input: UpdateReminderInput
) {
  const context = await requireRequestContext(organizationId, requestId)
  const current = await repository.retrieve(
    context.tenantId,
    requestId,
    reminderId
  )
  if (!current) return null

  const reminder = await repository.update(reminderId, {
    ...input,
    remindAt:
      input.remindAt === undefined
        ? undefined
        : fromUnixSeconds(input.remindAt),
  })

  return serialize(reminder)
}

export async function remove(
  organizationId: string,
  requestId: string,
  reminderId: string,
  deletedBy: string
) {
  const context = await requireRequestContext(organizationId, requestId)
  const reminder = await repository.retrieve(
    context.tenantId,
    requestId,
    reminderId
  )
  if (!reminder) return null

  return repository.remove(reminderId, deletedBy)
}
