import { crmError } from '../../http/errors.js'
import type {
  CreateReminderInput,
  CreateTaskInput,
  UpdateReminderInput,
  UpdateTaskInput,
} from '../../types/task.js'
import * as tenants from '../tenants/tenants.service.js'
import * as requestsRepository from './requests.repository.js'
import * as repository from './requests.tasks.repository.js'

/**
 * Turns a wire timestamp into a `Date` for Prisma.
 *
 * The wire carries Unix **seconds**; `new Date()` expects milliseconds, so the
 * bare `new Date(seconds)` this replaced landed every due date in January 1970.
 */
function fromUnixSeconds(seconds: number) {
  return new Date(seconds * 1000)
}
type TaskRow = Awaited<ReturnType<typeof repository.listTasks>>[number]
type ReminderRow = Awaited<ReturnType<typeof repository.listReminders>>[number]

async function requireTenant(organizationId: string) {
  const tenant = await tenants.retrieveByOrganization(organizationId)
  if (!tenant) throw crmError('crm/tenant-not-found')
  if (tenant.status !== 'ACTIVE') throw crmError('crm/tenant-inactive')

  return tenant
}

function serializeTimestamp(date: Date | null) {
  return date ? Math.floor(date.getTime() / 1000) : null
}

function serializeTask(taskRow: TaskRow) {
  return {
    ...taskRow,
    object: 'request_task' as const,
    dueAt: serializeTimestamp(taskRow.dueAt),
    completedAt: serializeTimestamp(taskRow.completedAt),
    createdAt: serializeTimestamp(taskRow.createdAt),
    updatedAt: serializeTimestamp(taskRow.updatedAt),
  }
}

function serializeReminder(reminderRow: ReminderRow) {
  return {
    ...reminderRow,
    object: 'request_reminder' as const,
    remindAt: serializeTimestamp(reminderRow.remindAt),
    sentAt: serializeTimestamp(reminderRow.sentAt),
    dismissedAt: serializeTimestamp(reminderRow.dismissedAt),
    createdAt: serializeTimestamp(reminderRow.createdAt),
    updatedAt: serializeTimestamp(reminderRow.updatedAt),
  }
}

async function requireRequest(organizationId: string, requestId: string) {
  const tenant = await requireTenant(organizationId)

  const request = await requestsRepository.retrieve(tenant.id, requestId)
  if (!request) throw crmError('crm/request-not-found')

  return tenant
}

/** Lists the tasks belonging to one visible request. */
export async function tasks(organizationId: string, requestId: string) {
  const tenant = await requireRequest(organizationId, requestId)

  const taskRows = await repository.listTasks(tenant.id, requestId)

  return taskRows.map(serializeTask)
}

/** Creates a task belonging to one visible request. */
export async function createTask(
  organizationId: string,
  requestId: string,
  input: CreateTaskInput
) {
  const tenant = await requireRequest(organizationId, requestId)

  const taskRow = await repository.createTask({
    tenantId: tenant.id,
    requestId,
    ...input,
    dueAt: input.dueAt ? fromUnixSeconds(input.dueAt) : null,
  })

  return serializeTask(taskRow)
}

/** Updates a task and keeps its completion stamp aligned with its status. */
export async function updateTask(
  organizationId: string,
  requestId: string,
  taskId: string,
  input: UpdateTaskInput
) {
  const tenant = await requireRequest(organizationId, requestId)

  const currentTask = await repository.getTask(tenant.id, requestId, taskId)
  if (!currentTask) return null

  // Mirror requests.service.update's resolvedAt/closedAt handling: leaving
  // DONE clears the stamp so task status and audit metadata cannot drift.
  const completionStamp =
    input.status === 'DONE' && !currentTask.completedAt
      ? { completedAt: new Date(), completedBy: input.completedBy }
      : input.status && input.status !== 'DONE' && currentTask.completedAt
        ? { completedAt: null, completedBy: null }
        : {}

  const updatedTask = await repository.updateTask(taskId, {
    ...input,
    ...completionStamp,
    dueAt:
      input.dueAt === undefined
        ? undefined
        : input.dueAt
          ? fromUnixSeconds(input.dueAt)
          : null,
  })

  return serializeTask(updatedTask)
}

/** Deletes one visible task from its request. */
export async function removeTask(
  organizationId: string,
  requestId: string,
  taskId: string,
  deletedBy: string
) {
  const tenant = await requireRequest(organizationId, requestId)

  const task = await repository.getTask(tenant.id, requestId, taskId)
  if (!task) return null

  return repository.removeTask(taskId, deletedBy)
}

/** Lists the reminders belonging to one visible request. */
export async function reminders(organizationId: string, requestId: string) {
  const tenant = await requireRequest(organizationId, requestId)

  const reminderRows = await repository.listReminders(tenant.id, requestId)

  return reminderRows.map(serializeReminder)
}

/** Creates a reminder belonging to one visible request. */
export async function createReminder(
  organizationId: string,
  requestId: string,
  input: CreateReminderInput
) {
  const tenant = await requireRequest(organizationId, requestId)

  const reminderRow = await repository.createReminder({
    tenantId: tenant.id,
    requestId,
    ...input,
    remindAt: fromUnixSeconds(input.remindAt),
  })

  return serializeReminder(reminderRow)
}

/** Updates one visible reminder belonging to a request. */
export async function updateReminder(
  organizationId: string,
  requestId: string,
  reminderId: string,
  input: UpdateReminderInput
) {
  const tenant = await requireRequest(organizationId, requestId)

  const reminder = await repository.getReminder(
    tenant.id,
    requestId,
    reminderId
  )
  if (!reminder) return null

  const updatedReminder = await repository.updateReminder(reminderId, {
    ...input,
    remindAt: input.remindAt ? fromUnixSeconds(input.remindAt) : undefined,
  })

  return serializeReminder(updatedReminder)
}

/** Deletes one visible reminder from its request. */
export async function removeReminder(
  organizationId: string,
  requestId: string,
  reminderId: string,
  deletedBy: string
) {
  const tenant = await requireRequest(organizationId, requestId)

  const reminder = await repository.getReminder(
    tenant.id,
    requestId,
    reminderId
  )
  if (!reminder) return null

  return repository.removeReminder(reminderId, deletedBy)
}
