import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'

type CreateReminderParams = Omit<Prisma.WorkReminderUncheckedCreateInput, 'id'>
type UpdateReminderParams = Prisma.WorkReminderUncheckedUpdateInput

type ReminderFilter = {
  contextService?: string
  contextResource?: string
  contextId?: string
  userId?: string
  status?: string
  limit: number
  startingAfter?: string
  endingBefore?: string
}

export async function list(tenantId: string, filter: ReminderFilter) {
  const cursorId = filter.startingAfter ?? filter.endingBefore
  const anchor = cursorId ? await retrieve(tenantId, cursorId) : null
  if (cursorId && !anchor) return []

  return prisma.workReminder.findMany({
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
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...(filter.status ? { status: filter.status as never } : {}),
      ...(anchor
        ? filter.startingAfter
          ? remindersAfter(anchor)
          : remindersBefore(anchor)
        : {}),
    },
    orderBy: filter.endingBefore
      ? [{ remindAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
      : [{ remindAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    take: filter.limit + 1,
  })
}

export const retrieve = (tenantId: string, reminderId: string) =>
  prisma.workReminder.findFirst({
    where: { tenantId, id: reminderId, deletedAt: null },
  })

export const due = (now: Date, limit = 500) =>
  prisma.workReminder.findMany({
    where: { deletedAt: null, status: 'SCHEDULED', remindAt: { lte: now } },
    orderBy: [{ remindAt: 'asc' }, { id: 'asc' }],
    take: limit,
  })

function remindersAfter(anchor: {
  remindAt: Date | null
  createdAt: Date
  id: string
}) {
  return {
    OR: [
      ...(anchor.remindAt ? [{ remindAt: { gt: anchor.remindAt } }] : []),
      { remindAt: anchor.remindAt, createdAt: { gt: anchor.createdAt } },
      {
        remindAt: anchor.remindAt,
        createdAt: anchor.createdAt,
        id: { gt: anchor.id },
      },
    ],
  }
}
function remindersBefore(anchor: {
  remindAt: Date | null
  createdAt: Date
  id: string
}) {
  return {
    OR: [
      ...(anchor.remindAt ? [{ remindAt: { lt: anchor.remindAt } }] : []),
      { remindAt: anchor.remindAt, createdAt: { lt: anchor.createdAt } },
      {
        remindAt: anchor.remindAt,
        createdAt: anchor.createdAt,
        id: { lt: anchor.id },
      },
    ],
  }
}

export const create = (params: CreateReminderParams) =>
  prisma.workReminder.create({
    data: { id: `reminder_${randomUUID().replaceAll('-', '')}`, ...params },
  })
export const update = (reminderId: string, params: UpdateReminderParams) =>
  prisma.workReminder.update({ where: { id: reminderId }, data: params })
export async function remove(reminderId: string, deletedBy: string) {
  if (process.env.DELETION_MODE === 'hard')
    await prisma.workReminder.delete({ where: { id: reminderId } })
  else
    await prisma.workReminder.update({
      where: { id: reminderId },
      data: { deletedAt: new Date(), deletedBy },
    })
  return { object: 'reminder' as const, id: reminderId, deleted: true as const }
}
