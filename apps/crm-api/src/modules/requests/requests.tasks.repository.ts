import { randomUUID } from 'node:crypto'
import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'

type CreateTaskParams = Omit<Prisma.RequestTaskUncheckedCreateInput, 'id'>
type UpdateTaskParams = Prisma.RequestTaskUncheckedUpdateInput
type CreateReminderParams = Omit<
  Prisma.RequestReminderUncheckedCreateInput,
  'id'
>
type UpdateReminderParams = Prisma.RequestReminderUncheckedUpdateInput

/** Lists visible tasks for one request in their configured order. */
export const listTasks = (tenantId: string, requestId: string) =>
  prisma.requestTask.findMany({
    where: { tenantId, requestId, deletedAt: null },
    orderBy: { sortOrder: 'asc' },
  })

/** Retrieves one visible task belonging to a request. */
export const getTask = (tenantId: string, requestId: string, taskId: string) =>
  prisma.requestTask.findFirst({
    where: { tenantId, requestId, id: taskId, deletedAt: null },
  })

/** Creates a task with an application-owned identifier. */
export const createTask = (params: CreateTaskParams) =>
  prisma.requestTask.create({
    data: { id: `crm_task_${randomUUID().replaceAll('-', '')}`, ...params },
  })

/** Updates a task by its application-owned identifier. */
export const updateTask = (taskId: string, params: UpdateTaskParams) =>
  prisma.requestTask.update({ where: { id: taskId }, data: params })

/** Deletes a task according to the configured deletion mode. */
export async function removeTask(taskId: string, deletedBy: string) {
  if (process.env.DELETION_MODE === 'hard')
    await prisma.requestTask.delete({ where: { id: taskId } })
  else
    await prisma.requestTask.update({
      where: { id: taskId },
      data: { deletedAt: new Date(), deletedBy },
    })

  return {
    object: 'request_task' as const,
    id: taskId,
    deleted: true as const,
  }
}

/** Lists visible reminders for one request in chronological order. */
export const listReminders = (tenantId: string, requestId: string) =>
  prisma.requestReminder.findMany({
    where: { tenantId, requestId, deletedAt: null },
    orderBy: { remindAt: 'asc' },
  })

/** Retrieves one visible reminder belonging to a request. */
export const getReminder = (
  tenantId: string,
  requestId: string,
  reminderId: string
) =>
  prisma.requestReminder.findFirst({
    where: { tenantId, requestId, id: reminderId, deletedAt: null },
  })

/** Creates a reminder with an application-owned identifier. */
export const createReminder = (params: CreateReminderParams) =>
  prisma.requestReminder.create({
    data: { id: `crm_rem_${randomUUID().replaceAll('-', '')}`, ...params },
  })

/** Updates a reminder by its application-owned identifier. */
export const updateReminder = (
  reminderId: string,
  params: UpdateReminderParams
) => prisma.requestReminder.update({ where: { id: reminderId }, data: params })

/** Deletes a reminder according to the configured deletion mode. */
export async function removeReminder(reminderId: string, deletedBy: string) {
  if (process.env.DELETION_MODE === 'hard')
    await prisma.requestReminder.delete({ where: { id: reminderId } })
  else
    await prisma.requestReminder.update({
      where: { id: reminderId },
      data: { deletedAt: new Date(), deletedBy },
    })

  return {
    object: 'request_reminder' as const,
    id: reminderId,
    deleted: true as const,
  }
}
