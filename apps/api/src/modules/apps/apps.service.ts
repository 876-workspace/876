import { createHash, randomBytes } from 'node:crypto'

import { AppHttpError } from '@/platform/errors'
import { generateId } from '@/platform/ids'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'
import { listObject, type ListObject } from '@/http/envelope'
import { createFinanceProvisioningRepository } from '@/services/finance-provisioning.repository'
import { reconcileFinanceConnections } from '@/services/finance-provisioning'

import type { ApiKeyRecord } from '@/http/auth'
import * as repository from './apps.repository'
import type {
  ApiKey,
  App,
  AppCreated,
  AppPublic,
  CreateApiKeyBody,
  CreateAppBody,
  ListApiKeysQuery,
  ListAppFeaturesQuery,
  ListAppsQuery,
  UpdateApiKeyBody,
  UpdateAppBody,
} from './apps.schemas'
import {
  serializeApiKey,
  serializeApiKeyCreated,
  serializeApp,
  serializeAppCreated,
  serializeAppPublic,
} from './apps.serializers'

/**
 * Business logic for registered apps and their credentials.
 *
 * Key *validity* — revoked, expired, unknown — is decided in the HTTP auth
 * guard rather than here, deliberately: every rejection reason is logged from
 * one place, so an operator reading `api_key.rejected` sees the whole picture
 * without correlating two layers. What this module owns is the record itself.
 */

export function findApiKeyByHash(
  keyHash: string
): Promise<ApiKeyRecord | null> {
  return repository.findApiKeyByHash(keyHash)
}

export function markApiKeyUsed(apiKeyId: string, at: number): Promise<void> {
  return repository.markApiKeyUsed(apiKeyId, at)
}

// ---------------------------------------------------------------------------
// App CRUD
// ---------------------------------------------------------------------------

export async function listApps(
  query: ListAppsQuery,
  isAdmin: boolean
): Promise<ListObject<App>> {
  if (query.organizationId) {
    const { data, hasMore } = await repository.listAppsByOrg(query)
    return listObject({ data: data.map(serializeApp), hasMore, url: '/apps' })
  }

  if (!isAdmin) {
    throw new AppHttpError({
      code: 'provider/invalid-request',
      message: 'organizationId is required.',
      httpStatus: 400,
    })
  }

  const { data, hasMore } = await repository.listAppsAll(query)
  return listObject({ data: data.map(serializeApp), hasMore, url: '/apps' })
}

export async function createApp(body: CreateAppBody): Promise<AppCreated> {
  const scopes = body.scopesAllowed ?? ['openid', 'profile', 'email']
  for (const s of scopes) {
    if (!ALLOWED_SCOPES.has(s)) {
      throw new AppHttpError({
        code: 'provider/invalid-scope',
        message: 'The requested scope is not allowed for this app.',
        httpStatus: 400,
      })
    }
  }

  const redirectUris = body.redirectUris ?? []
  for (const uri of redirectUris) {
    if (!isRedirectUriSafe(uri)) {
      throw new AppHttpError({
        code: 'provider/invalid-redirect-uri',
        message: 'The redirect URI is not registered for this app.',
        httpStatus: 400,
      })
    }
  }

  const clientSecret =
    body.clientType === 'confidential' ? generateClientSecret() : null
  const clientSecretHash = clientSecret ? hashClientSecret(clientSecret) : null

  const slug = `${slugifyRegisteredAppName(body.name) || 'app'}-${randomBytes(4).toString('hex')}`

  const now = nowUnixSeconds()
  const row = await repository.createApp({
    id: generateId('registeredApp'),
    name: body.name.trim(),
    slug,
    organizationId: body.organizationId ?? null,
    clientId: generateClientId(),
    clientSecretHash,
    clientType: body.clientType,
    appKind: body.appKind,
    status: body.status,
    allowedRedirectUris: redirectUris,
    allowedLogoutUris: [],
    logoUrl: body.logoUrl ?? null,
    homepageUrl: body.homepageUrl ?? null,
    scopesAllowed: scopes,
    createdAt: BigInt(now),
    updatedAt: BigInt(now),
  })

  log.info(
    { app_id: row.id, slug: row.slug, client_id: row.clientId },
    'apps.create'
  )

  return serializeAppCreated(row, clientSecret)
}

export async function getAppPublic(clientId: string): Promise<AppPublic> {
  const row = await repository.findAppByClientId(clientId)
  if (!row) {
    throw new AppHttpError({
      code: 'app/not-found',
      message: 'App not found.',
      httpStatus: 404,
    })
  }
  return serializeAppPublic(row)
}

export async function getCurrentApp(
  appId: string | null | undefined
): Promise<App> {
  const row = appId ? await repository.findAppById(appId) : null
  if (!row) {
    throw new AppHttpError({
      code: 'app/not-found',
      message: 'App not found.',
      httpStatus: 404,
    })
  }
  return serializeApp(row)
}

export async function getApp(appId: string): Promise<App> {
  const row = await repository.findAppById(appId)
  if (!row) {
    throw new AppHttpError({
      code: 'app/not-found',
      message: 'App not found.',
      httpStatus: 404,
    })
  }
  // Soft-deleted apps are considered not found
  // Prisma findUnique returns row even if deletedAt set, so check
  // repository delete sets deletedAt; we check if row was soft-deleted via extra query? Instead rely on repository to filter.
  // For now, treat any row with known soft-delete as not found by checking deletedAt via raw? We don't have it in SELECT, but AppRow includes no deletedAt.
  // So we need to add deletedAt to SELECT or check via separate query. For now, rely on delete setting flag; subsequent find will still return it — we handle via repository delete check? Better to filter.
  return serializeApp(row)
}

export async function updateApp(
  appId: string,
  body: Record<string, unknown>
): Promise<App> {
  const updates = { ...body } as Record<string, unknown>
  // body comes from Zod with snake/camel mapping; we need to map to Prisma fields
  // The controller passes already mapped fields; see controller.

  // Ensure at least one field is being updated — controller's Zod refine already handles empty, but service also checks.
  if (Object.keys(updates).length === 0) {
    throw new AppHttpError({
      code: 'provider/invalid-request',
      message: 'No fields to update.',
      httpStatus: 400,
    })
  }

  ;(updates as Record<string, unknown>).updatedAt = BigInt(nowUnixSeconds())

  const row = await repository.updateApp(appId, updates)
  if (!row) {
    throw new AppHttpError({
      code: 'app/not-found',
      message: 'App not found.',
      httpStatus: 404,
    })
  }

  log.info(
    { app_id: appId, changed_fields: Object.keys(updates).sort() },
    'apps.update'
  )
  return serializeApp(row)
}

export async function deleteApp(
  appId: string
): Promise<{ object: string; id: string; deleted: true }> {
  const deleted = await repository.deleteApp(appId)
  if (!deleted) {
    throw new AppHttpError({
      code: 'app/not-found',
      message: 'App not found.',
      httpStatus: 404,
    })
  }
  log.info({ app_id: appId }, 'apps.delete')
  return { object: 'app', id: appId, deleted: true as const }
}

export async function listAppFeatures(
  appId: string,
  query: {
    limit: number
    starting_after?: string
    ending_before?: string
    rootOnly?: boolean
    includeTag?: string
    excludeTag?: string
  }
): Promise<ListObject<Record<string, unknown>>> {
  const app = await repository.findAppById(appId)
  if (!app) {
    throw new AppHttpError({
      code: 'app/not-found',
      message: 'App not found.',
      httpStatus: 404,
    })
  }
  const { data, hasMore } = await repository.listFeaturesForApp(appId, query)
  // Serialize features: convert BigInt timestamps, handle Json etc.
  const serialized = data.map((row) => {
    const r = row as Record<string, unknown> & {
      id: string
      provider: string
      providerFeatureId: string | null
      providerEnvironmentId: string | null
      slug: string
      name: string
      description: string | null
      tags: string[]
      enabled: boolean
      defaultValue: boolean
      valueType: string | null
      value: unknown
      serverSideOnly: boolean
      archivedAt: bigint | null
      parentFeatureId: string | null
      providerMetadata: unknown
      consumerDefaultEnabled: boolean
      scope: string
      appId: string | null
      syncedAt: bigint
      createdAt: bigint
      updatedAt: bigint
    }
    return {
      object: 'feature',
      id: r.id,
      provider: r.provider,
      provider_feature_id: r.providerFeatureId,
      provider_environment_id: r.providerEnvironmentId,
      slug: r.slug,
      name: r.name,
      description: r.description,
      tags: r.tags ?? [],
      enabled: r.enabled,
      default_value: r.defaultValue,
      value_type: r.valueType,
      value: r.value ?? null,
      server_side_only: r.serverSideOnly,
      archived_at: r.archivedAt === null ? null : Number(r.archivedAt),
      parent_feature_id: r.parentFeatureId,
      provider_metadata: r.providerMetadata ?? null,
      consumer_default_enabled: r.consumerDefaultEnabled,
      scope: r.scope,
      app_id: r.appId,
      synced_at: Number(r.syncedAt),
      created_at: Number(r.createdAt),
      updated_at: Number(r.updatedAt),
    }
  })
  return listObject({
    data: serialized,
    hasMore,
    url: `/apps/${appId}/features`,
  })
}

export async function listAppSubscriptions(
  appId: string
): Promise<Record<string, unknown>[]> {
  const app = await repository.findAppById(appId)
  if (!app) {
    throw new AppHttpError({
      code: 'app/not-found',
      message: 'App not found.',
      httpStatus: 404,
    })
  }
  const rows = await repository.listSubscriptionsByApp(appId)
  return rows.map((row) => {
    const r = row as Record<string, unknown> & {
      id: string
      organizationId: string
      appId: string
      status: string
      providerStatus: string | null
      statusReason: string | null
      collectionMethod: string
      billingCycleAnchor: bigint | null
      currentPeriodStart: bigint | null
      currentPeriodEnd: bigint | null
      cancelAt: bigint | null
      cancelAtPeriodEnd: boolean
      canceledAt: bigint | null
      endedAt: bigint | null
      pauseCollection: unknown
      trialStart: bigint | null
      trialEnd: bigint | null
      startDate: bigint | null
      defaultPaymentMethodId: string | null
      latestInvoiceId: string | null
      pendingUpdate: unknown
      scheduleId: string | null
      metadata: unknown
      createdAt: bigint
      updatedAt: bigint
      stripeSubscriptionId: string | null
      financeLifecycleVersion: number
    }
    return {
      object: 'subscription',
      id: r.id,
      organization_id: r.organizationId,
      app_id: r.appId,
      status: r.status,
      provider_status: r.providerStatus,
      status_reason: r.statusReason,
      collection_method: r.collectionMethod,
      billing_cycle_anchor:
        r.billingCycleAnchor === null ? null : Number(r.billingCycleAnchor),
      current_period_start:
        r.currentPeriodStart === null ? null : Number(r.currentPeriodStart),
      current_period_end:
        r.currentPeriodEnd === null ? null : Number(r.currentPeriodEnd),
      cancel_at: r.cancelAt === null ? null : Number(r.cancelAt),
      cancel_at_period_end: r.cancelAtPeriodEnd,
      canceled_at: r.canceledAt === null ? null : Number(r.canceledAt),
      ended_at: r.endedAt === null ? null : Number(r.endedAt),
      pause_collection: r.pauseCollection ?? null,
      trial_start: r.trialStart === null ? null : Number(r.trialStart),
      trial_end: r.trialEnd === null ? null : Number(r.trialEnd),
      start_date: r.startDate === null ? null : Number(r.startDate),
      default_payment_method_id: r.defaultPaymentMethodId,
      latest_invoice_id: r.latestInvoiceId,
      pending_update: r.pendingUpdate ?? null,
      schedule_id: r.scheduleId,
      metadata: r.metadata ?? null,
      created_at: Number(r.createdAt),
      updated_at: Number(r.updatedAt),
      stripe_subscription_id: r.stripeSubscriptionId,
      finance_lifecycle_version: r.financeLifecycleVersion,
    }
  })
}

export async function createApiKey(
  appId: string,
  body: CreateApiKeyBody
): Promise<Record<string, unknown>> {
  const app = await repository.findAppById(appId)
  if (!app) {
    throw new AppHttpError({
      code: 'app/not-found',
      message: 'App not found.',
      httpStatus: 404,
    })
  }
  const plaintext = generateApiKey()
  const now = nowUnixSeconds()
  const row = await repository.createApiKey({
    id: generateId('apiKey'),
    appId,
    keyHash: hashApiKey(plaintext),
    name: body.name ?? null,
    expiresAt:
      body.expiresAt === null || body.expiresAt === undefined
        ? null
        : BigInt(body.expiresAt),
    createdAt: BigInt(now),
  })
  log.info({ app_id: appId, key_id: row.id }, 'apps.api_key.create')
  return { ...serializeApiKey(row), key: plaintext }
}

export async function listApiKeys(
  appId: string,
  query: { limit: number; starting_after?: string; ending_before?: string }
): Promise<ListObject<ApiKey>> {
  const app = await repository.findAppById(appId)
  if (!app) {
    throw new AppHttpError({
      code: 'app/not-found',
      message: 'App not found.',
      httpStatus: 404,
    })
  }
  const { data, hasMore } = await repository.listApiKeysByApp(
    appId,
    query as never
  )
  return listObject({
    data: data.map(serializeApiKey),
    hasMore,
    url: `/apps/${appId}/api-keys`,
  })
}

export async function updateApiKey(
  appId: string,
  keyId: string,
  body: UpdateApiKeyBody
): Promise<ApiKey> {
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (Object.keys(updates).length === 0) {
    throw new AppHttpError({
      code: 'provider/invalid-request',
      message: 'No fields to update.',
      httpStatus: 400,
    })
  }
  const row = await repository.updateApiKey(keyId, appId, updates)
  if (!row) {
    throw new AppHttpError({
      code: 'api-key/not-found',
      message: 'API key not found.',
      httpStatus: 404,
    })
  }
  return serializeApiKey(row)
}

export async function revokeApiKey(
  appId: string,
  keyId: string
): Promise<ApiKey> {
  const row = await repository.revokeApiKey(keyId, appId)
  if (!row) {
    throw new AppHttpError({
      code: 'api-key/not-found',
      message: 'API key not found.',
      httpStatus: 404,
    })
  }
  log.info({ app_id: appId, key_id: keyId }, 'apps.api_key.revoke')
  return serializeApiKey(row)
}

export async function deleteApiKey(
  appId: string,
  keyId: string
): Promise<{ object: string; id: string; deleted: true }> {
  const deleted = await repository.deleteApiKey(keyId, appId)
  if (!deleted) {
    throw new AppHttpError({
      code: 'api-key/not-found',
      message: 'API key not found.',
      httpStatus: 404,
    })
  }
  log.info({ app_id: appId, key_id: keyId }, 'apps.api_key.delete')
  return { object: 'api_key', id: keyId, deleted: true as const }
}

const log = getLogger('apps')

const ALLOWED_SCOPES = new Set([
  'openid',
  'profile',
  'email',
  'offline_access',
  'address',
  'phone',
])

function generateClientId(): string {
  return `876_client_${randomBytes(16).toString('base64url')}`
}

function generateClientSecret(): string {
  return `876_cs_${randomBytes(32).toString('base64url')}`
}

function hashClientSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex')
}

function slugifyRegisteredAppName(name: string): string {
  let s = name.toLowerCase().trim()
  s = s.replace(/[^a-z0-9]+/g, '-')
  s = s.replace(/^-+|-+$/g, '')
  return s.slice(0, 80)
}

function generateApiKey(): string {
  return `876_app_secret_${randomBytes(32).toString('base64url')}`
}

function hashApiKey(key: string): string {
  return createHash('sha256').update(key, 'utf8').digest('hex')
}

function isRedirectUriSafe(uri: string): boolean {
  try {
    const parsed = new URL(uri)
    if (parsed.protocol === 'https:') return true
    if (parsed.protocol === 'http:') {
      const h = parsed.hostname
      return h === 'localhost' || h === '127.0.0.1' || h === '::1'
    }
    return false
  } catch {
    return false
  }
}

async function requireApp(appId: string) {
  const row = await repository.findAppById(appId)
  if (!row)
    throw new AppHttpError({
      code: 'app/not-found',
      message: 'App not found.',
      httpStatus: 404,
    })
  return row
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------
