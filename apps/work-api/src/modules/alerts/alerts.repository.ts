import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'

type CreateParams = Omit<Prisma.WorkAlertUncheckedCreateInput, 'id'>
type UpdateParams = Prisma.WorkAlertUncheckedUpdateInput
type Filter = { taskId?: string; eventId?: string; userId?: string; status?: string; limit: number; startingAfter?: string; endingBefore?: string }

export async function list(tenantId: string, filter: Filter) {
  const cursor = filter.startingAfter ?? filter.endingBefore
  const anchor = cursor ? await retrieve(tenantId, cursor) : null
  if (cursor && !anchor) return []
  return prisma.workAlert.findMany({
    where: {
      tenantId,
      ...(filter.taskId ? { taskId: filter.taskId } : {}),
      ...(filter.eventId ? { eventId: filter.eventId } : {}),
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...(filter.status ? { status: filter.status as never } : {}),
      ...(anchor ? (filter.startingAfter ? { id: { gt: anchor.id } } : { id: { lt: anchor.id } }) : {}),
    },
    orderBy: { id: filter.endingBefore ? 'desc' : 'asc' },
    take: filter.limit + 1,
  })
}
export const retrieve = (tenantId: string, alertId: string) => prisma.workAlert.findFirst({ where: { tenantId, id: alertId } })
export const create = (params: CreateParams) => prisma.workAlert.create({ data: { id: `alert_${randomUUID().replaceAll('-', '')}`, ...params } })
export const update = (alertId: string, params: UpdateParams) => prisma.workAlert.update({ where: { id: alertId }, data: params })
export async function remove(alertId: string) {
  await prisma.workAlert.delete({ where: { id: alertId } })
  return { object: 'alert' as const, id: alertId, deleted: true as const }
}
export const absoluteDue = (now: Date, limit = 500) => prisma.workAlert.findMany({
  where: { status: 'SCHEDULED', triggerType: 'ABSOLUTE', triggerAt: { lte: now } },
  orderBy: [{ triggerAt: 'asc' }, { id: 'asc' }],
  take: limit,
  include: { task: true, event: true },
})
export const relativeCandidates = (limit = 500) => prisma.workAlert.findMany({
  where: { status: 'SCHEDULED', triggerType: 'RELATIVE' },
  orderBy: { createdAt: 'asc' },
  take: limit,
  include: { task: true, event: true },
})
