import type { Prisma } from '@/db'
import { prisma } from '@/db/client'
import { paginateByCursor, type PaginationQuery } from '@/http/envelope'
import type { ApiKeyRecord } from '@/http/auth'
import { fromDbUnixSeconds } from '@/platform/timestamps'

import type { ApiKeyRow, AppRow } from './apps.serializers'
import type { ListAppsQuery } from './apps.schemas'

/**
 * Every query against the tables the `apps` module owns — `apps`, `api_keys`,
 * app assignments, and per-user app enrollment. No other file may reach them.
 */

/**
 * Look up an API key by the hash of its plaintext.
 *
 * Keys are stored hashed and looked up by hash, so a database dump never yields
 * a usable credential and the lookup itself is a single indexed read.
 */
export async function findApiKeyByHash(
  keyHash: string
): Promise<ApiKeyRecord | null> {
  const row = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: { id: true, appId: true, revoked: true, expiresAt: true },
  })
  if (!row) return null

  return {
    id: row.id,
    appId: row.appId,
    revoked: row.revoked,
    expiresAt: row.expiresAt === null ? null : fromDbUnixSeconds(row.expiresAt),
  }
}

/** Record that a key was presented. Telemetry — the caller must not await it. */
export async function markApiKeyUsed(
  apiKeyId: string,
  at: number
): Promise<void> {
  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { lastUsedAt: BigInt(at) },
  })
}

// ---------------------------------------------------------------------------
// App CRUD — the tables the `apps` module owns.
// ---------------------------------------------------------------------------

const APP_SELECT = {
  id: true,
  name: true,
  slug: true,
  organizationId: true,
  clientId: true,
  clientType: true,
  appKind: true,
  status: true,
  allowedRedirectUris: true,
  allowedLogoutUris: true,
  logoUrl: true,
  logoFileId: true,
  homepageUrl: true,
  type: true,
  scopesAllowed: true,
  createdAt: true,
  updatedAt: true,
} as const

const API_KEY_SELECT = {
  id: true,
  appId: true,
  name: true,
  revoked: true,
  expiresAt: true,
  lastUsedAt: true,
  createdAt: true,
} as const

export function findAppById(id: string): Promise<AppRow | null> {
  return prisma.app.findFirst({
    where: { id, deletedAt: null },
    select: APP_SELECT,
  }) as Promise<AppRow | null>
}

export function findAppByClientId(clientId: string): Promise<AppRow | null> {
  return prisma.app.findFirst({
    where: { clientId, deletedAt: null },
    select: APP_SELECT,
  }) as Promise<AppRow | null>
}

export function findAppBySlug(slug: string): Promise<AppRow | null> {
  return prisma.app.findFirst({
    where: { slug, deletedAt: null },
    select: APP_SELECT,
  }) as Promise<AppRow | null>
}

export async function createApp(data: {
  id: string
  name: string
  slug: string
  organizationId: string | null
  clientId: string
  clientSecretHash: string | null
  clientType: string
  appKind: string
  status: string
  allowedRedirectUris: string[]
  allowedLogoutUris: string[]
  logoUrl: string | null
  homepageUrl: string | null
  scopesAllowed: string[]
  createdAt: bigint
  updatedAt: bigint
}): Promise<AppRow> {
  return prisma.app.create({ data, select: APP_SELECT }) as Promise<AppRow>
}

export async function updateApp(
  appId: string,
  data: Record<string, unknown>
): Promise<AppRow | null> {
  const exists = await prisma.app.findUnique({
    where: { id: appId },
    select: { id: true },
  })
  if (!exists) return null
  return prisma.app.update({
    where: { id: appId },
    data: data as never,
    select: APP_SELECT,
  }) as Promise<AppRow>
}

export async function deleteApp(appId: string): Promise<boolean> {
  const row = await prisma.app.findUnique({
    where: { id: appId },
    select: { id: true, deletedAt: true },
  })
  if (!row) return false
  if (row.deletedAt !== null) return false
  const now = BigInt(Math.floor(Date.now() / 1000))
  await prisma.app.update({
    where: { id: appId },
    data: { deletedAt: now, updatedAt: now },
  })
  return true
}

// Pagination for apps: ordered by created_at DESC, matching Python.

export function listAppsByOrg(
  query: ListAppsQuery
): Promise<{ data: AppRow[]; hasMore: boolean }> {
  const where: Prisma.AppWhereInput = {
    organizationId: query.organizationId,
    deletedAt: null,
  }
  if (query.status) where.status = query.status

  return paginateByCursor<AppRow>({
    query: query as PaginationQuery,
    loadAnchor: (id) => findAppById(id),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.app.findMany({
        where: cursor
          ? {
              ...where,
              createdAt: { [cursor.direction]: cursor.value } as never,
            }
          : where,
        orderBy: { createdAt: order },
        take,
        select: APP_SELECT,
      }) as Promise<AppRow[]>,
  })
}

export function listAppsAll(
  query: ListAppsQuery
): Promise<{ data: AppRow[]; hasMore: boolean }> {
  const where: Prisma.AppWhereInput = { deletedAt: null }
  if (query.appKind) where.appKind = query.appKind
  if (query.clientType) where.clientType = query.clientType
  if (query.status) where.status = query.status

  return paginateByCursor<AppRow>({
    query: query as PaginationQuery,
    loadAnchor: (id) => findAppById(id),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.app.findMany({
        where: cursor
          ? {
              ...where,
              createdAt: { [cursor.direction]: cursor.value } as never,
            }
          : where,
        orderBy: { createdAt: order },
        take,
        select: APP_SELECT,
      }) as Promise<AppRow[]>,
  })
}

// ---------------------------------------------------------------------------
// API keys sub-resource
// ---------------------------------------------------------------------------

export function findApiKeyById(
  keyId: string,
  appId?: string
): Promise<ApiKeyRow | null> {
  const where: Record<string, unknown> = { id: keyId }
  if (appId) (where as Record<string, unknown>).appId = appId
  return prisma.apiKey.findFirst({
    where: where as never,
    select: API_KEY_SELECT,
  }) as Promise<ApiKeyRow | null>
}

export async function createApiKey(data: {
  id: string
  appId: string
  keyHash: string
  name: string | null
  expiresAt: bigint | null
  createdAt: bigint
}): Promise<ApiKeyRow> {
  return prisma.apiKey.create({
    data,
    select: API_KEY_SELECT,
  }) as Promise<ApiKeyRow>
}

export async function updateApiKey(
  keyId: string,
  appId: string,
  data: Record<string, unknown>
): Promise<ApiKeyRow | null> {
  const updated = await prisma.apiKey.updateMany({
    where: { id: keyId, appId },
    data: data as never,
  })
  if (updated.count === 0) return null
  return findApiKeyById(keyId, appId)
}

export async function revokeApiKey(
  keyId: string,
  appId: string
): Promise<ApiKeyRow | null> {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const updated = await prisma.apiKey.updateMany({
    where: { id: keyId, appId },
    data: { revoked: true, lastUsedAt: now } as never,
  })
  if (updated.count === 0) return null
  return findApiKeyById(keyId, appId)
}

export async function deleteApiKey(
  keyId: string,
  appId: string
): Promise<boolean> {
  const result = await prisma.apiKey.deleteMany({ where: { id: keyId, appId } })
  return result.count > 0
}

export function listApiKeysByApp(
  appId: string,
  query: PaginationQuery
): Promise<{ data: ApiKeyRow[]; hasMore: boolean }> {
  return paginateByCursor<ApiKeyRow>({
    query,
    loadAnchor: (id) => findApiKeyById(id),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.apiKey.findMany({
        where: cursor
          ? { appId, createdAt: { [cursor.direction]: cursor.value } as never }
          : { appId },
        orderBy: { createdAt: order },
        take,
        select: API_KEY_SELECT,
      }) as Promise<ApiKeyRow[]>,
  })
}

// ---------------------------------------------------------------------------
// Features and subscriptions for app
// ---------------------------------------------------------------------------

const APP_FEATURE_SELECT = {
  id: true,
  provider: true,
  providerFeatureId: true,
  providerEnvironmentId: true,
  slug: true,
  name: true,
  description: true,
  tags: true,
  enabled: true,
  defaultValue: true,
  valueType: true,
  value: true,
  serverSideOnly: true,
  archivedAt: true,
  parentFeatureId: true,
  providerMetadata: true,
  consumerDefaultEnabled: true,
  scope: true,
  appId: true,
  syncedAt: true,
  createdAt: true,
  updatedAt: true,
} as const

export type AppFeatureRow = Awaited<
  ReturnType<
    typeof prisma.feature.findFirstOrThrow<{
      select: typeof APP_FEATURE_SELECT
    }>
  >
>

function findFeatureById(id: string): Promise<AppFeatureRow | null> {
  return prisma.feature.findUnique({
    where: { id },
    select: APP_FEATURE_SELECT,
  })
}

export function listFeaturesForApp(
  appId: string,
  query: {
    limit: number
    starting_after?: string
    ending_before?: string
    rootOnly?: boolean
    includeTag?: string
    excludeTag?: string
  }
): Promise<{ data: AppFeatureRow[]; hasMore: boolean }> {
  const baseWhere: Prisma.FeatureWhereInput = { appId }
  if (query.rootOnly) baseWhere.parentFeatureId = null
  if (query.includeTag) baseWhere.tags = { has: query.includeTag }
  if (query.excludeTag) baseWhere.NOT = { tags: { has: query.excludeTag } }

  return paginateByCursor<AppFeatureRow>({
    query: {
      limit: query.limit,
      starting_after: query.starting_after,
      ending_before: query.ending_before,
    },
    // The anchor is read with the same projection as the page: a narrower one
    // would not satisfy the row type, and casting it away is how a cursor read
    // ends up silently returning a shape the serializer cannot handle.
    loadAnchor: (id) => findFeatureById(id),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.feature.findMany({
        where: cursor
          ? { ...baseWhere, createdAt: { [cursor.direction]: cursor.value } }
          : baseWhere,
        orderBy: { createdAt: order },
        take,
        select: APP_FEATURE_SELECT,
      }),
  })
}

export function listSubscriptionsByApp(
  appId: string
): Promise<Array<Record<string, unknown>>> {
  return prisma.subscription.findMany({
    where: { appId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      organizationId: true,
      appId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  }) as Promise<Array<Record<string, unknown>>>
}
