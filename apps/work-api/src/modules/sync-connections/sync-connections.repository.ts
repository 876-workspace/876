import { randomUUID } from 'node:crypto'
import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'
type CreateParams = Omit<Prisma.WorkSyncConnectionUncheckedCreateInput, 'id'>
type UpdateParams = Prisma.WorkSyncConnectionUncheckedUpdateInput
type Filter = {
  userId?: string
  provider?: string
  status?: string
  limit: number
  startingAfter?: string
  endingBefore?: string
}
export async function list(tenantId: string, filter: Filter) {
  const cursor = filter.startingAfter ?? filter.endingBefore
  const anchor = cursor ? await retrieve(tenantId, cursor) : null
  if (cursor && !anchor) return []
  return prisma.workSyncConnection.findMany({
    where: {
      tenantId,
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...(filter.provider ? { provider: filter.provider as never } : {}),
      ...(filter.status ? { status: filter.status as never } : {}),
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
export const retrieve = (tenantId: string, id: string) =>
  prisma.workSyncConnection.findFirst({ where: { tenantId, id } })
export const retrieveById = (id: string) =>
  prisma.workSyncConnection.findUnique({ where: { id } })
export const create = (params: CreateParams) =>
  prisma.workSyncConnection.create({
    data: { id: `sync_${randomUUID().replaceAll('-', '')}`, ...params },
  })
export const update = (id: string, params: UpdateParams) =>
  prisma.workSyncConnection.update({ where: { id }, data: params })
export async function remove(id: string) {
  await prisma.$transaction(async (tx) => {
    await tx.workSyncCredential.deleteMany({ where: { connectionId: id } })
    await tx.workSyncConnection.update({
      where: { id },
      data: {
        status: 'REVOKED',
        credentialRef: null,
        syncCursor: null,
        oauthStateHash: null,
        oauthStateExpiresAt: null,
      },
    })
  })

  return { object: 'sync_connection' as const, id, deleted: true as const }
}
