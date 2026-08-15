import { featurePrefixForAppSlug } from '@/services/features'
import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '@/platform/timestamps'

import type { ApiKey, App, AppPublic } from './apps.schemas'

export type AppRow = {
  id: string
  name: string
  slug: string
  organizationId: string | null
  clientId: string
  clientType: string
  appKind: string
  status: string
  allowedRedirectUris: string[]
  allowedLogoutUris: string[]
  logoUrl: string | null
  logoFileId: string | null
  homepageUrl: string | null
  type: string
  scopesAllowed: string[]
  createdAt: bigint
  updatedAt: bigint
}

export type ApiKeyRow = {
  id: string
  appId: string
  name: string | null
  revoked: boolean
  expiresAt: bigint | null
  lastUsedAt: bigint | null
  createdAt: bigint
}

export function serializeApp(row: AppRow): App {
  return {
    object: 'app',
    id: row.id,
    name: row.name,
    slug: row.slug,
    feature_prefix: featurePrefixForAppSlug(row.slug),
    organizationId: row.organizationId,
    clientId: row.clientId,
    client_type: row.clientType,
    appKind: row.appKind as App['appKind'],
    status: row.status as App['status'],
    allowed_redirect_uris: row.allowedRedirectUris ?? [],
    allowed_logout_uris: row.allowedLogoutUris ?? [],
    logoUrl: row.logoUrl,
    logoFileId: row.logoFileId ?? null,
    homepageUrl: row.homepageUrl,
    type: row.type,
    scopes_allowed: row.scopesAllowed ?? [],
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }

export function serializeAppCreated(
  row: AppRow,
  clientSecret: string | null
): App & { clientSecret: string | null } {
  const base = serializeApp(row)
  return { ...base, clientSecret: clientSecret }
}

export function serializeAppPublic(row: AppRow): AppPublic {
  return {
    object: 'app',
    name: row.name,
    logoUrl: row.logoUrl,
    logoFileId: row.logoFileId ?? null,
    appKind: row.appKind as AppPublic['appKind'],
  }

export function serializeApiKey(row: ApiKeyRow): ApiKey {
  return {
    object: 'apiKey',
    id: row.id,
    appId: row.appId,
    name: row.name ?? null,
    revoked: row.revoked,
    expiresAt: nullableFromDbUnixSeconds(row.expiresAt),
    last_used_at: nullableFromDbUnixSeconds(row.lastUsedAt),
    createdAt: fromDbUnixSeconds(row.createdAt),
  }

export function serializeApiKeyCreated(
  row: ApiKeyRow,
  plaintext: string
): ApiKey & { key: string } {
  return { ...serializeApiKey(row), key: plaintext }
}
