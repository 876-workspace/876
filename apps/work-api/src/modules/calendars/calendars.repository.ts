import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'

type CreateParams = Omit<Prisma.WorkCalendarUncheckedCreateInput, 'id' | 'uid'>
type UpdateParams = Prisma.WorkCalendarUncheckedUpdateInput
type Filter = {
  userId?: string
  visibility?: string
  limit: number
  startingAfter?: string
  endingBefore?: string
}

export async function list(tenantId: string, filter: Filter) {
  const cursor = filter.startingAfter ?? filter.endingBefore
  const anchor = cursor ? await retrieve(tenantId, cursor) : null
  if (cursor && !anchor) return []
  return prisma.workCalendar.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(filter.userId
        ? {
            subscriptions: { some: { userId: filter.userId, isVisible: true } },
          }
        : {}),
      ...(filter.visibility ? { visibility: filter.visibility as never } : {}),
      ...(anchor
        ? filter.startingAfter
          ? { id: { gt: anchor.id } }
          : { id: { lt: anchor.id } }
        : {}),
    },
    orderBy: { id: filter.endingBefore ? 'desc' : 'asc' },
    take: filter.limit + 1,
  })
}
export const retrieve = (tenantId: string, calendarId: string) =>
  prisma.workCalendar.findFirst({
    where: { tenantId, id: calendarId, deletedAt: null },
  })
export const primaryForUser = (tenantId: string, userId: string) =>
  prisma.workCalendar.findFirst({
    where: { tenantId, ownerUserId: userId, isPrimary: true, deletedAt: null },
  })
export async function create(params: CreateParams) {
  return prisma.$transaction(async (tx) => {
    const id = `calendar_${randomUUID().replaceAll('-', '')}`
    const uid = `${id}@work.876`
    const isPrimary = params.ownerUserId
      ? !(await tx.workCalendar.findFirst({
          where: {
            tenantId: params.tenantId,
            ownerUserId: params.ownerUserId,
            isPrimary: true,
            deletedAt: null,
          },
        }))
      : false
    const calendar = await tx.workCalendar.create({
      data: { id, uid, ...params, isPrimary },
    })
    if (params.ownerUserId) {
      await tx.workCalendarSubscription.create({
        data: {
          id: `calsub_${randomUUID().replaceAll('-', '')}`,
          tenantId: params.tenantId,
          calendarId: calendar.id,
          userId: params.ownerUserId,
          role: 'OWNER',
          isVisible: true,
          defaultReminderMinutes: [],
        },
      })
    }
    return calendar
  })
}
export const update = (calendarId: string, params: UpdateParams) =>
  prisma.workCalendar.update({ where: { id: calendarId }, data: params })
export async function remove(calendarId: string, deletedBy: string) {
  if (process.env.DELETION_MODE === 'hard')
    await prisma.workCalendar.delete({ where: { id: calendarId } })
  else
    await prisma.workCalendar.update({
      where: { id: calendarId },
      data: { deletedAt: new Date(), deletedBy },
    })
  return { object: 'calendar' as const, id: calendarId, deleted: true as const }
}
