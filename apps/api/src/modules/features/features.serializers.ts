/**
 * Row → API resource for features and grants.
 *
 * The serializer is the only place `snake_case` wire fields and `BigInt`
 * timestamps meet the Prisma `camelCase` + `bigint` model.
 */

import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '@/platform/timestamps'

import type { Feature, OrgFeature, UserFeature } from './features.schemas'

export type FeatureRow = {
  id: string
  provider: string
  providerFeatureId: string | null
  providerEnvironmentId: string | null
  slug: string
  name: string
  description: string | null
  tags: string[] | null
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

export type UserFeatureRow = {
  id: string
  userId: string
  featureId: string
  status: string
  note: string | null
  syncedAt: bigint
  createdAt: bigint
  updatedAt: bigint
  feature?: { slug: string } | null
  slug?: string
}

export type OrgFeatureRow = {
  id: string
  organizationId: string
  featureId: string
  status: string
  note: string | null
  syncedAt: bigint
  createdAt: bigint
  updatedAt: bigint
  feature?: { slug: string } | null
  slug?: string
}

export type OrgFeatureGrantItemRow = {
  id: string
  organizationId: string
  featureId: string
  status: string
  note: string | null
  createdAt: bigint
  updatedAt: bigint
  organization: {
    name: string | null
    slug: string
    logoUrl: string | null
  } | null
  feature: { slug: string }
}

export type UserFeatureGrantItemRow = {
  id: string
  userId: string
  featureId: string
  status: string
  note: string | null
  createdAt: bigint
  updatedAt: bigint
  user: {
    email: string
    firstName: string
    lastName: string
    username: string | null
    avatar: string | null
  } | null
  feature: { slug: string }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function serializeFeature(row: FeatureRow): Feature {
  return {
    object: 'feature',
    id: row.id,
    provider: row.provider,
    provider_feature_id: row.providerFeatureId,
    provider_environment_id: row.providerEnvironmentId,
    slug: row.slug,
    name: row.name,
    description: row.description,
    tags: row.tags ?? [],
    enabled: row.enabled,
    default_value: row.defaultValue,
    value_type: row.valueType,
    value: row.value ?? null,
    server_side_only: row.serverSideOnly,
    archived_at: nullableFromDbUnixSeconds(row.archivedAt),
    parent_feature_id: row.parentFeatureId,
    provider_metadata: asRecord(row.providerMetadata),
    consumer_default_enabled: row.consumerDefaultEnabled,
    scope: row.scope,
    app_id: row.appId,
    synced_at: fromDbUnixSeconds(row.syncedAt),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

function slugForGrant(row: UserFeatureRow | OrgFeatureRow): string {
  if (typeof (row as { slug?: string }).slug === 'string')
    return (row as { slug: string }).slug
  if (row.feature?.slug) return row.feature.slug
  return ''
}

export function serializeUserFeature(row: UserFeatureRow): UserFeature {
  return {
    object: 'user_feature',
    id: row.id,
    user_id: row.userId,
    feature_id: row.featureId,
    slug: slugForGrant(row),
    status: row.status,
    note: row.note,
    synced_at: fromDbUnixSeconds(row.syncedAt),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeOrgFeature(row: OrgFeatureRow): OrgFeature {
  return {
    object: 'org_feature',
    id: row.id,
    organization_id: row.organizationId,
    feature_id: row.featureId,
    slug: slugForGrant(row),
    status: row.status,
    note: row.note,
    synced_at: fromDbUnixSeconds(row.syncedAt),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeOrgFeatureGrantItem(row: OrgFeatureGrantItemRow) {
  return {
    object: 'org_feature_grant' as const,
    id: row.id,
    organization_id: row.organizationId,
    feature_id: row.featureId,
    slug: row.feature.slug,
    status: row.status,
    note: row.note,
    organization_name: row.organization?.name ?? null,
    organization_slug: row.organization?.slug ?? '',
    organization_logo_url: row.organization?.logoUrl ?? null,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeUserFeatureGrantItem(row: UserFeatureGrantItemRow) {
  return {
    object: 'user_feature_grant' as const,
    id: row.id,
    user_id: row.userId,
    feature_id: row.featureId,
    slug: row.feature.slug,
    status: row.status,
    note: row.note,
    user_email: row.user?.email ?? '',
    user_first_name: row.user?.firstName ?? '',
    user_last_name: row.user?.lastName ?? '',
    user_username: row.user?.username ?? null,
    user_avatar: row.user?.avatar ?? null,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
