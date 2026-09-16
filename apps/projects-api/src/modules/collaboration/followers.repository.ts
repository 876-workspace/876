import { prisma } from '../../db/index.js'
import type { FollowerRow } from './followers.serializers.js'

export type FollowClient = Pick<typeof prisma, 'follower'>

export type FollowSeed = {
  subjectType: string
  subjectId: string
  userId: string
}

export async function upsertFollows(
  client: FollowClient,
  params: {
    id: (seed: FollowSeed) => string
    tenantId: string
    follows: FollowSeed[]
    createdAt: bigint
  }
): Promise<void> {
  const seen = new Set<string>()
  for (const follow of params.follows) {
    const key = `${follow.subjectType}:${follow.subjectId}:${follow.userId}`
    if (seen.has(key)) continue
    seen.add(key)
    await client.follower.upsert({
      where: {
        tenantId_subjectType_subjectId_userId: {
          tenantId: params.tenantId,
          subjectType: follow.subjectType,
          subjectId: follow.subjectId,
          userId: follow.userId,
        },
      },
      create: {
        id: params.id(follow),
        tenantId: params.tenantId,
        subjectType: follow.subjectType,
        subjectId: follow.subjectId,
        userId: follow.userId,
        createdAt: params.createdAt,
      },
      update: {},
    })
  }
}

export async function listForSubject(
  tenantId: string,
  subjectType: string,
  subjectId: string,
  options: { limit: number; startingAfter?: string }
): Promise<FollowerRow[]> {
  const rows = await prisma.follower.findMany({
    where: { tenantId, subjectType, subjectId },
    cursor: options.startingAfter ? { id: options.startingAfter } : undefined,
    skip: options.startingAfter ? 1 : 0,
    take: options.limit + 1,
    orderBy: { createdAt: 'asc' },
  })
  return rows as FollowerRow[]
}

export async function removeFollow(
  tenantId: string,
  subjectType: string,
  subjectId: string,
  userId: string
): Promise<boolean> {
  const existing = await prisma.follower.findUnique({
    where: {
      tenantId_subjectType_subjectId_userId: {
        tenantId,
        subjectType,
        subjectId,
        userId,
      },
    },
  })
  if (!existing) return false
  await prisma.follower.delete({ where: { id: existing.id } })
  return true
}

export async function followOne(
  tenantId: string,
  params: FollowSeed & { id: string; createdAt: bigint }
): Promise<FollowerRow> {
  const row = await prisma.follower.upsert({
    where: {
      tenantId_subjectType_subjectId_userId: {
        tenantId,
        subjectType: params.subjectType,
        subjectId: params.subjectId,
        userId: params.userId,
      },
    },
    create: {
      id: params.id,
      tenantId,
      subjectType: params.subjectType,
      subjectId: params.subjectId,
      userId: params.userId,
      createdAt: params.createdAt,
    },
    update: {},
  })
  return row as FollowerRow
}

export async function upsertTenantFollows(params: {
  id: () => string
  tenantId: string
  follows: FollowSeed[]
  createdAt: bigint
}): Promise<void> {
  await upsertFollows(prisma, params)
}
