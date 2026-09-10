import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'

type CreateParams = Omit<Prisma.WorkSyncMappingUncheckedCreateInput, 'id'>
type UpdateParams = Prisma.WorkSyncMappingUncheckedUpdateInput

export const list = (connectionId: string) =>
  prisma.workSyncMapping.findMany({
    where: { connectionId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })

export const listChildren = (parentMappingId: string) =>
  prisma.workSyncMapping.findMany({
    where: { parentMappingId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })

export const retrieve = (connectionId: string, id: string) =>
  prisma.workSyncMapping.findFirst({ where: { connectionId, id } })

export const retrieveByLocal = (input: {
  connectionId: string
  resourceType: 'CALENDAR' | 'EVENT'
  localId: string
  parentMappingId?: string | null
}) =>
  prisma.workSyncMapping.findFirst({
    where: {
      connectionId: input.connectionId,
      resourceType: input.resourceType,
      localId: input.localId,
      parentMappingId: input.parentMappingId ?? null,
    },
  })

export const retrieveByRemote = (input: {
  connectionId: string
  resourceType: 'CALENDAR' | 'EVENT'
  remoteId: string
  parentMappingId?: string | null
}) =>
  prisma.workSyncMapping.findFirst({
    where: {
      connectionId: input.connectionId,
      resourceType: input.resourceType,
      remoteId: input.remoteId,
      parentMappingId: input.parentMappingId ?? null,
    },
  })

export const create = (params: CreateParams) =>
  prisma.workSyncMapping.create({
    data: { id: `syncmap_${randomUUID().replaceAll('-', '')}`, ...params },
  })

export const update = (id: string, params: UpdateParams) =>
  prisma.workSyncMapping.update({ where: { id }, data: params })

export const deleteChildren = (parentMappingId: string) =>
  prisma.workSyncMapping.deleteMany({ where: { parentMappingId } })

export async function remove(id: string) {
  await prisma.workSyncMapping.delete({ where: { id } })
  return { object: 'sync_mapping' as const, id, deleted: true as const }
}
