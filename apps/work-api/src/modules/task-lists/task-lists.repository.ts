import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'

type ListFilter = {
  ownerUserId?: string
  limit: number
  startingAfter?: string
  endingBefore?: string
}

type CreateParams = Omit<Prisma.WorkTaskListUncheckedCreateInput, 'id'>
type UpdateParams = Prisma.WorkTaskListUncheckedUpdateInput

export async function list(tenantId: string, filter: ListFilter) {
  const cursorId = filter.startingAfter ?? filter.endingBefore
  const anchor = cursorId ? await retrieve(tenantId, cursorId) : null
  if (cursorId && !anchor) return []

  return prisma.workTaskList.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(filter.ownerUserId ? { ownerUserId: filter.ownerUserId } : {}),
      ...(anchor
        ? filter.startingAfter
          ? {
              OR: [
                { sortOrder: { gt: anchor.sortOrder } },
                { sortOrder: anchor.sortOrder, id: { gt: anchor.id } },
              ],
            }
          : {
              OR: [
                { sortOrder: { lt: anchor.sortOrder } },
                { sortOrder: anchor.sortOrder, id: { lt: anchor.id } },
              ],
            }
        : {}),
    },
    orderBy: filter.endingBefore
      ? [{ sortOrder: 'desc' }, { id: 'desc' }]
      : [{ sortOrder: 'asc' }, { id: 'asc' }],
    take: filter.limit + 1,
  })
}

export const retrieve = (tenantId: string, listId: string) =>
  prisma.workTaskList.findFirst({
    where: { tenantId, id: listId, deletedAt: null },
  })

export const retrieveDefault = (tenantId: string) =>
  prisma.workTaskList.findFirst({
    where: { tenantId, isDefault: true, deletedAt: null },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })

export async function ensureDefault(tenantId: string, createdBy: string) {
  const existing = await retrieveDefault(tenantId)
  if (existing) return existing

  try {
    return await prisma.workTaskList.create({
      data: {
        id: `tasklist_${randomUUID().replaceAll('-', '')}`,
        tenantId,
        name: 'Inbox',
        description: 'Default organization task list.',
        ownerUserId: null,
        isDefault: true,
        sortOrder: 0,
        createdBy,
      },
    })
  } catch {
    const concurrent = await retrieveDefault(tenantId)
    if (concurrent) return concurrent
    throw new Error('Unable to ensure the default Work task list.')
  }
}

export const create = (params: CreateParams) =>
  prisma.workTaskList.create({
    data: { id: `tasklist_${randomUUID().replaceAll('-', '')}`, ...params },
  })

export const update = (listId: string, params: UpdateParams) =>
  prisma.workTaskList.update({ where: { id: listId }, data: params })

export async function remove(listId: string, deletedBy: string) {
  if (process.env.DELETION_MODE === 'hard')
    await prisma.workTaskList.delete({ where: { id: listId } })
  else
    await prisma.workTaskList.update({
      where: { id: listId },
      data: { deletedAt: new Date(), deletedBy },
    })

  return { object: 'task_list' as const, id: listId, deleted: true as const }
}
