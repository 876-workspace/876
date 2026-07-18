import * as z from 'zod'

import type { ApiResult } from './api'
import type { AppError } from './errors'
import type { FeatureErrorCode } from './features-errors'

const featureIdSchema = z.string().trim().min(1)
const featureSlugSchema = z.string().trim().min(1).max(128)
const featureNameSchema = z.string().trim().min(1).max(160)
const featureDescriptionSchema = z.string().trim().min(1).max(500)
const featureUnixTimestampSchema = z.int().nonnegative()
const featureListLimitSchema = z.int().min(1).max(100)
const userIdSchema = z.string().trim().min(1)
const noteSchema = z.string().trim().min(1).max(500)

export type FeatureScope = 'consumer' | 'enterprise' | 'global'

export type Feature = {
  object: 'feature'
  id: string
  workosFeatureId: string
  slug: string
  name: string
  description: string | null
  owner: Record<string, unknown> | null
  tags: string[]
  enabled: boolean
  defaultValue: boolean
  consumerDefaultEnabled: boolean
  scope: FeatureScope
  workosCreatedAt: number
  workosUpdatedAt: number
  syncedAt: number
  createdAt: number
  updatedAt: number
}

export type UserFeatureStatus = 'enabled' | 'disabled'

export type UserFeature = {
  object: 'user_feature'
  id: string
  userId: string
  featureId: string
  slug: string
  status: UserFeatureStatus
  note: string | null
  syncedAt: number
  createdAt: number
  updatedAt: number
}

export type FeatureListParams = {
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export type FeatureRetrieveParams = {
  featureId: string
}

export type FeatureSyncParams = {
  limit?: number
}

export type FeatureSetConsumerDefaultParams = {
  featureId: string
  enabled: boolean
}

export type UserFeatureListParams = {
  userId: string
}

export type UserFeatureGrantParams = {
  userId: string
  featureId: string
  note?: string
}

export type UserFeatureDisableParams = {
  userId: string
  featureId: string
  note?: string
}

const featureScopeSchema = z.enum(['consumer', 'enterprise', 'global'])

export const featureSchema = z.strictObject({
  object: z.literal('feature'),
  id: featureIdSchema,
  workosFeatureId: featureIdSchema,
  slug: featureSlugSchema,
  name: featureNameSchema,
  description: featureDescriptionSchema.nullable(),
  owner: z.record(z.string(), z.unknown()).nullable(),
  tags: z.array(z.string()),
  enabled: z.boolean(),
  defaultValue: z.boolean(),
  consumerDefaultEnabled: z.boolean(),
  scope: featureScopeSchema,
  workosCreatedAt: featureUnixTimestampSchema,
  workosUpdatedAt: featureUnixTimestampSchema,
  syncedAt: featureUnixTimestampSchema,
  createdAt: featureUnixTimestampSchema,
  updatedAt: featureUnixTimestampSchema,
}) satisfies z.ZodType<Feature>

export const userFeatureStatusSchema = z.enum(['enabled', 'disabled'])

export const userFeatureSchema = z.strictObject({
  object: z.literal('user_feature'),
  id: featureIdSchema,
  userId: userIdSchema,
  featureId: featureIdSchema,
  slug: featureSlugSchema,
  status: userFeatureStatusSchema,
  note: noteSchema.nullable(),
  syncedAt: featureUnixTimestampSchema,
  createdAt: featureUnixTimestampSchema,
  updatedAt: featureUnixTimestampSchema,
}) satisfies z.ZodType<UserFeature>

export const featureListParamsSchema = z.strictObject({
  limit: featureListLimitSchema.optional(),
  startingAfter: featureIdSchema.optional(),
  endingBefore: featureIdSchema.optional(),
}) satisfies z.ZodType<FeatureListParams>

export const featureRetrieveParamsSchema = z.strictObject({
  featureId: featureIdSchema,
}) satisfies z.ZodType<FeatureRetrieveParams>

export const featureSyncParamsSchema = z.strictObject({
  limit: featureListLimitSchema.optional(),
}) satisfies z.ZodType<FeatureSyncParams>

export const featureSetConsumerDefaultParamsSchema = z.strictObject({
  featureId: featureIdSchema,
  enabled: z.boolean(),
}) satisfies z.ZodType<FeatureSetConsumerDefaultParams>

export const userFeatureListParamsSchema = z.strictObject({
  userId: userIdSchema,
}) satisfies z.ZodType<UserFeatureListParams>

export const userFeatureGrantParamsSchema = z.strictObject({
  userId: userIdSchema,
  featureId: featureIdSchema,
  note: noteSchema.optional(),
}) satisfies z.ZodType<UserFeatureGrantParams>

export const userFeatureDisableParamsSchema = userFeatureGrantParamsSchema

export type OrgFeature = {
  object: 'org_feature'
  id: string
  organizationId: string
  featureId: string
  slug: string
  status: UserFeatureStatus
  note: string | null
  syncedAt: number
  createdAt: number
  updatedAt: number
}

export type OrgFeatureListParams = {
  organizationId: string
}

export type OrgFeatureGrantParams = {
  organizationId: string
  featureId: string
  note?: string
}

export type OrgFeatureDisableParams = OrgFeatureGrantParams

export const orgFeatureSchema = z.strictObject({
  object: z.literal('org_feature'),
  id: featureIdSchema,
  organizationId: userIdSchema,
  featureId: featureIdSchema,
  slug: featureSlugSchema,
  status: userFeatureStatusSchema,
  note: noteSchema.nullable(),
  syncedAt: featureUnixTimestampSchema,
  createdAt: featureUnixTimestampSchema,
  updatedAt: featureUnixTimestampSchema,
}) satisfies z.ZodType<OrgFeature>

export const orgFeatureListParamsSchema = z.strictObject({
  organizationId: userIdSchema,
}) satisfies z.ZodType<OrgFeatureListParams>

const orgIdSchema = z.string().trim().min(1)

export const orgFeatureGrantParamsSchema = z.strictObject({
  organizationId: orgIdSchema,
  featureId: featureIdSchema,
  note: noteSchema.optional(),
}) satisfies z.ZodType<OrgFeatureGrantParams>

export const orgFeatureDisableParamsSchema = orgFeatureGrantParamsSchema

export type FeatureSdkResult<T> = ApiResult<T, AppError<FeatureErrorCode>>

// ---------------------------------------------------------------------------
// Admin-only feature param types and schemas
// ---------------------------------------------------------------------------

/**
 * Parameters for creating a new feature flag. Admin-only.
 * These types must never be exported from the public 876 npm package.
 */
export type FeatureCreateParams = {
  slug: string
  name: string
  description?: string
  enabled?: boolean
  defaultValue?: boolean
  consumerDefaultEnabled?: boolean
}

/**
 * Parameters for updating an existing feature flag. Admin-only.
 * These types must never be exported from the public 876 npm package.
 */
export type FeatureUpdateParams = {
  name?: string
  description?: string | null
  enabled?: boolean
  defaultValue?: boolean
  consumerDefaultEnabled?: boolean
}

export const featureCreateParamsSchema = z.strictObject({
  slug: featureSlugSchema,
  name: featureNameSchema,
  description: featureDescriptionSchema.optional(),
  enabled: z.boolean().optional(),
  defaultValue: z.boolean().optional(),
  consumerDefaultEnabled: z.boolean().optional(),
}) satisfies z.ZodType<FeatureCreateParams>

export const featureUpdateParamsSchema = z.strictObject({
  name: featureNameSchema.optional(),
  description: featureDescriptionSchema.nullable().optional(),
  enabled: z.boolean().optional(),
  defaultValue: z.boolean().optional(),
  consumerDefaultEnabled: z.boolean().optional(),
}) satisfies z.ZodType<FeatureUpdateParams>
