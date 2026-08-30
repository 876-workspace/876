import { randomUUID } from 'node:crypto'
import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'
type CreateParams = Omit<
  Prisma.WorkCalendarSubscriptionUncheckedCreateInput,
  'id'
>
type UpdateParams = Prisma.WorkCalendarSubscriptionUncheckedUpdateInput
export const list = (tenantId: string, calendarId: string) =>
  prisma.workCalendarSubscription.findMany({
    where: { tenantId, calendarId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
export const retrieve = (tenantId: string, calendarId: string, id: string) =>
  prisma.workCalendarSubscription.findFirst({
    where: { tenantId, calendarId, id },
  })
export const create = (params: CreateParams) =>
  prisma.workCalendarSubscription.create({
    data: { id: `calsub_${randomUUID().replaceAll('-', '')}`, ...params },
  })
export const update = (id: string, params: UpdateParams) =>
  prisma.workCalendarSubscription.update({ where: { id }, data: params })
export async function remove(id: string) {
  await prisma.workCalendarSubscription.delete({ where: { id } })
  return {
    object: 'calendar_subscription' as const,
    id,
    deleted: true as const,
  }
}
