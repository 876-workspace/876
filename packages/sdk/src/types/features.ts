import * as z from 'zod'

import type { Result } from './api.ts'

export const sdk876FeatureSchema = z.strictObject({
  object: z.literal('feature'),
  id: z.string(),
  provider: z.string(),
  providerFeatureId: z.string().nullable(),
  providerEnvironmentId: z.string().nullable(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  tags: z.array(z.string()),
  enabled: z.boolean(),
  defaultValue: z.boolean(),
  valueType: z.string().nullable(),
  value: z.unknown().nullable(),
  serverSideOnly: z.boolean(),
  archivedAt: z.number().nullable(),
  parentFeatureId: z.string().nullable(),
  providerMetadata: z.record(z.string(), z.unknown()).nullable(),
  consumerDefaultEnabled: z.boolean(),
  scope: z.string(),
  appId: z.string().nullable(),
  syncedAt: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const sdk876FeatureListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(sdk876FeatureSchema),
  hasMore: z.boolean(),
  url: z.string(),
  totalCount: z.number().int().nullable().optional(),
})

export type Feature = z.infer<typeof sdk876FeatureSchema>
export type FeatureList = z.infer<typeof sdk876FeatureListSchema>
export type FeatureListResult = Result<FeatureList>
