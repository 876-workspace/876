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

type SyncLeaseInput = {
  id: string
  token: string
  now: Date
  expiresAt: Date
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

export const listActiveForSync = (limit = 50) =>
  prisma.workSyncConnection.findMany({
    where: {
      status: 'ACTIVE',
      credentialRef: { not: null },
      mappings: { some: { resourceType: 'CALENDAR', parentMappingId: null } },
    },
    include: { tenant: true },
    orderBy: [{ lastSyncedAt: 'asc' }, { id: 'asc' }],
    take: limit,
  })

export const retrieve = (tenantId: string, id: string) =>
  prisma.workSyncConnection.findFirst({ where: { tenantId, id } })

export const retrieveById = (id: string) =>
  prisma.workSyncConnection.findUnique({ where: { id } })

export const retrieveWithTenantById = (id: string) =>
  prisma.workSyncConnection.findUnique({
    where: { id },
    include: { tenant: true },
  })

export const create = (params: CreateParams) =>
  prisma.workSyncConnection.create({
    data: { id: `sync_${randomUUID().replaceAll('-', '')}`, ...params },
  })

export const update = (id: string, params: UpdateParams) =>
  prisma.workSyncConnection.update({ where: { id }, data: params })

export async function acquireSyncLease(input: SyncLeaseInput) {
  const result = await prisma.workSyncConnection.updateMany({
    where: {
      id: input.id,
      OR: [
        { syncLeaseToken: null },
        { syncLeaseExpiresAt: null },
        { syncLeaseExpiresAt: { lte: input.now } },
      ],
    },
    data: {
      syncLeaseToken: input.token,
      syncLeaseExpiresAt: input.expiresAt,
      syncLeaseHeartbeatAt: input.now,
    },
  })
  return result.count === 1
}

export async function heartbeatSyncLease(input: SyncLeaseInput) {
  const result = await prisma.workSyncConnection.updateMany({
    where: { id: input.id, syncLeaseToken: input.token },
    data: {
      syncLeaseExpiresAt: input.expiresAt,
      syncLeaseHeartbeatAt: input.now,
    },
  })
  return result.count === 1
}

export async function releaseSyncLease(id: string, token: string) {
  const result = await prisma.workSyncConnection.updateMany({
    where: { id, syncLeaseToken: token },
    data: {
      syncLeaseToken: null,
      syncLeaseExpiresAt: null,
      syncLeaseHeartbeatAt: null,
    },
  })
  return result.count === 1
}

export const setOauthState = (input: {
  id: string
  hash: string
  expiresAt: Date
}) =>
  prisma.workSyncConnection.update({
    where: { id: input.id },
    data: {
      oauthStateHash: input.hash,
      oauthStateExpiresAt: input.expiresAt,
    },
  })

export async function consumeOauthState(input: {
  id: string
  hash: string
  now: Date
}) {
  const result = await prisma.workSyncConnection.updateMany({
    where: {
      id: input.id,
      oauthStateHash: input.hash,
      oauthStateExpiresAt: { gte: input.now },
    },
    data: {
      oauthStateHash: null,
      oauthStateExpiresAt: null,
    },
  })
  return result.count === 1
}

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
        syncLeaseToken: null,
        syncLeaseExpiresAt: null,
        syncLeaseHeartbeatAt: null,
      },
    })
  })

  return { object: 'sync_connection' as const, id, deleted: true as const }
}
