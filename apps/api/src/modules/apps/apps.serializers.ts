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
    organization_id: row.organizationId,
    client_id: row.clientId,
    client_type: row.clientType,
    app_kind: row.appKind as App['app_kind'],
    status: row.status as App['status'],
    allowed_redirect_uris: row.allowedRedirectUris ?? [],
    allowed_logout_uris: row.allowedLogoutUris ?? [],
    logo_url: row.logoUrl,
    logo_file_id: row.logoFileId ?? null,
    homepage_url: row.homepageUrl,
    type: row.type,
    scopes_allowed: row.scopesAllowed ?? [],
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeAppCreated(
  row: AppRow,
  clientSecret: string | null
): App & { client_secret: string | null } {
  const base = serializeApp(row)
  return { ...base, client_secret: clientSecret }
}

export function serializeAppPublic(row: AppRow): AppPublic {
  return {
    object: 'app',
    name: row.name,
    logo_url: row.logoUrl,
    logo_file_id: row.logoFileId ?? null,
    app_kind: row.appKind as AppPublic['app_kind'],
  }
}

export function serializeApiKey(row: ApiKeyRow): ApiKey {
  return {
    object: 'api_key',
    id: row.id,
    app_id: row.appId,
    name: row.name ?? null,
    revoked: row.revoked,
    expires_at: nullableFromDbUnixSeconds(row.expiresAt),
    last_used_at: nullableFromDbUnixSeconds(row.lastUsedAt),
    created_at: fromDbUnixSeconds(row.createdAt),
  }
}

export function serializeApiKeyCreated(
  row: ApiKeyRow,
  plaintext: string
): ApiKey & { key: string } {
  return { ...serializeApiKey(row), key: plaintext }
}
