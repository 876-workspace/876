import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'

type CreateTaskParams = Omit<Prisma.WorkTaskUncheckedCreateInput, 'id' | 'uid'>
type UpdateTaskParams = Prisma.WorkTaskUncheckedUpdateInput

type TaskFilter = {
  contextService?: string
  contextResource?: string
  contextId?: string
  listId?: string
  parentTaskId?: string | null
  priorityId?: string
  assigneeId?: string
  status?: string
  limit: number
  startingAfter?: string
  endingBefore?: string
}

const include = {
  links: {
    orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }],
  },
  assignments: {
    orderBy: [{ assignedAt: 'asc' as const }, { id: 'asc' as const }],
  },
} satisfies Prisma.WorkTaskInclude

export async function list(tenantId: string, filter: TaskFilter) {
  const cursorId = filter.startingAfter ?? filter.endingBefore
  const anchor = cursorId ? await retrieve(tenantId, cursorId) : null
  if (cursorId && !anchor) return []

  return prisma.workTask.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(filter.contextService
        ? { contextService: filter.contextService }
        : {}),
      ...(filter.contextResource
        ? { contextResource: filter.contextResource }
        : {}),
      ...(filter.contextId ? { contextId: filter.contextId } : {}),
      ...(filter.listId ? { listId: filter.listId } : {}),
      ...(filter.parentTaskId !== undefined
        ? { parentTaskId: filter.parentTaskId }
        : {}),
      ...(filter.priorityId ? { priorityId: filter.priorityId } : {}),
      ...(filter.assigneeId ? { assigneeId: filter.assigneeId } : {}),
      ...(filter.status ? { status: filter.status as never } : {}),
      ...(anchor
        ? filter.startingAfter
          ? tasksAfter(anchor)
          : tasksBefore(anchor)
        : {}),
    },
    include,
    orderBy: filter.endingBefore
      ? [{ sortOrder: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
      : [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    take: filter.limit + 1,
  })
}

export const retrieve = (tenantId: string, taskId: string) =>
  prisma.workTask.findFirst({
    where: { tenantId, id: taskId, deletedAt: null },
    include,
  })

function tasksAfter(anchor: {
  sortOrder: number
  createdAt: Date
  id: string
}) {
  return {
    OR: [
      { sortOrder: { gt: anchor.sortOrder } },
      { sortOrder: anchor.sortOrder, createdAt: { gt: anchor.createdAt } },
      {
        sortOrder: anchor.sortOrder,
        createdAt: anchor.createdAt,
        id: { gt: anchor.id },
      },
    ],
  }
}

function tasksBefore(anchor: {
  sortOrder: number
  createdAt: Date
  id: string
}) {
  return {
    OR: [
      { sortOrder: { lt: anchor.sortOrder } },
      { sortOrder: anchor.sortOrder, createdAt: { lt: anchor.createdAt } },
      {
        sortOrder: anchor.sortOrder,
        createdAt: anchor.createdAt,
        id: { lt: anchor.id },
      },
    ],
  }
}

export async function create(params: CreateTaskParams) {
  return prisma.workTask.create({
    data: {
      ...params,
      id: `task_${randomUUID().replaceAll('-', '')}`,
      uid: `task_${randomUUID().replaceAll('-', '')}@work.876`,
    },
    include,
  })
}

export const update = (taskId: string, params: UpdateTaskParams) =>
  prisma.workTask.update({ where: { id: taskId }, data: params, include })

export async function syncPrimaryLink(
  taskId: string,
  context: { service: string; resource: string; id: string } | null
) {
  return prisma.$transaction(async (tx) => {
    await tx.workTaskLink.updateMany({
      where: { taskId, isPrimary: true },
      data: { isPrimary: false },
    })
    if (!context) return

    const existing = await tx.workTaskLink.findFirst({
      where: {
        taskId,
        service: context.service,
        resource: context.resource,
        externalId: context.id,
      },
    })
    if (existing) {
      await tx.workTaskLink.update({
        where: { id: existing.id },
        data: { isPrimary: true },
      })
      return
    }

    await tx.workTaskLink.create({
      data: {
        id: `tasklink_${randomUUID().replaceAll('-', '')}`,
        taskId,
        service: context.service,
        resource: context.resource,
        externalId: context.id,
        isPrimary: true,
      },
    })
  })
}

export async function syncPrimaryAssignee(
  taskId: string,
  assigneeId: string | null,
  assignedBy: string
) {
  return prisma.$transaction(async (tx) => {
    await tx.workTaskAssignment.deleteMany({
      where: { taskId, targetType: 'USER', role: 'OWNER' },
    })
    if (!assigneeId) return
    await tx.workTaskAssignment.create({
      data: {
        id: `assign_${randomUUID().replaceAll('-', '')}`,
        taskId,
        targetType: 'USER',
        assigneeId,
        role: 'OWNER',
        status: 'PENDING',
        assignedBy,
      },
    })
  })
}

export async function remove(taskId: string, deletedBy: string) {
  if (process.env.DELETION_MODE === 'hard')
    await prisma.workTask.delete({ where: { id: taskId } })
  else
    await prisma.workTask.update({
      where: { id: taskId },
      data: { deletedAt: new Date(), deletedBy },
    })

  return { object: 'task' as const, id: taskId, deleted: true as const }
}
