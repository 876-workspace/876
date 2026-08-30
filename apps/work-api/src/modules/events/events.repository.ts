import { randomUUID } from 'node:crypto'
import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'

type CreateParams = Omit<Prisma.WorkEventUncheckedCreateInput, 'id' | 'uid'>
type UpdateParams = Prisma.WorkEventUncheckedUpdateInput
type Filter = {
  calendarId?: string
  contextService?: string
  contextResource?: string
  contextId?: string
  from?: Date
  to?: Date
  status?: string
  limit: number
  startingAfter?: string
  endingBefore?: string
}
const include = {
  participants: {
    orderBy: [{ role: 'asc' as const }, { createdAt: 'asc' as const }],
  },
} satisfies Prisma.WorkEventInclude
export async function list(tenantId: string, filter: Filter) {
  const cursor = filter.startingAfter ?? filter.endingBefore
  const anchor = cursor ? await retrieve(tenantId, cursor) : null
  if (cursor && !anchor) return []
  const dateRange =
    filter.from || filter.to
      ? {
          OR: [
            {
              startAt: {
                ...(filter.from ? { gte: filter.from } : {}),
                ...(filter.to ? { lt: filter.to } : {}),
              },
            },
            {
              startDate: {
                ...(filter.from ? { gte: filter.from } : {}),
                ...(filter.to ? { lt: filter.to } : {}),
              },
            },
          ],
        }
      : {}
  return prisma.workEvent.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(filter.calendarId ? { calendarId: filter.calendarId } : {}),
      ...(filter.contextService
        ? { contextService: filter.contextService }
        : {}),
      ...(filter.contextResource
        ? { contextResource: filter.contextResource }
        : {}),
      ...(filter.contextId ? { contextId: filter.contextId } : {}),
      ...(filter.status ? { status: filter.status as never } : {}),
      ...dateRange,
      ...(anchor
        ? filter.startingAfter
          ? { id: { gt: anchor.id } }
          : { id: { lt: anchor.id } }
        : {}),
    },
    include,
    orderBy: { id: filter.endingBefore ? 'desc' : 'asc' },
    take: filter.limit + 1,
  })
}
export const retrieve = (tenantId: string, eventId: string) =>
  prisma.workEvent.findFirst({
    where: { tenantId, id: eventId, deletedAt: null },
    include,
  })
export const create = (params: CreateParams) => {
  const id = `event_${randomUUID().replaceAll('-', '')}`
  return prisma.workEvent.create({
    data: { id, uid: `${id}@work.876`, ...params },
    include,
  })
}
export const update = (eventId: string, params: UpdateParams) =>
  prisma.workEvent.update({ where: { id: eventId }, data: params, include })
export async function remove(eventId: string, deletedBy: string) {
  if (process.env.DELETION_MODE === 'hard')
    await prisma.workEvent.delete({ where: { id: eventId } })
  else
    await prisma.workEvent.update({
      where: { id: eventId },
      data: { deletedAt: new Date(), deletedBy },
    })
  return { object: 'event' as const, id: eventId, deleted: true as const }
}
