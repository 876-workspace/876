import { randomUUID } from 'node:crypto'
import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'
type CreateParams = Omit<Prisma.WorkEventParticipantUncheckedCreateInput, 'id'>
type UpdateParams = Prisma.WorkEventParticipantUncheckedUpdateInput
export const list = (eventId: string) =>
  prisma.workEventParticipant.findMany({
    where: { eventId },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  })
export const retrieve = (eventId: string, id: string) =>
  prisma.workEventParticipant.findFirst({ where: { eventId, id } })
export const create = (params: CreateParams) =>
  prisma.workEventParticipant.create({
    data: { id: `participant_${randomUUID().replaceAll('-', '')}`, ...params },
  })
export const update = (id: string, params: UpdateParams) =>
  prisma.workEventParticipant.update({ where: { id }, data: params })
export async function respond(
  eventId: string,
  id: string,
  userId: string,
  expectedStatus:
    'NEEDS_ACTION' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'DELEGATED',
  params: UpdateParams
) {
  const result = await prisma.workEventParticipant.updateMany({
    where: {
      id,
      eventId,
      kind: 'USER',
      participantId: userId,
      status: expectedStatus,
    },
    data: params,
  })
  if (result.count !== 1) return null
  return prisma.workEventParticipant.findUniqueOrThrow({ where: { id } })
}
export async function remove(id: string) {
  await prisma.workEventParticipant.delete({ where: { id } })
  return { object: 'event_participant' as const, id, deleted: true as const }
}
