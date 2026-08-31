import * as z from 'zod'

import type { Result } from './api.ts'

export const sdk876FeatureSchema = z.strictObject({
  object: z.literal('feature'),
  id: z.string(),
  provider: z.string(),
  provider_feature_id: z.string().nullable(),
  provider_environment_id: z.string().nullable(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  tags: z.array(z.string()),
  enabled: z.boolean(),
  default_value: z.boolean(),
  value_type: z.string().nullable(),
  value: z.unknown().nullable(),
  server_side_only: z.boolean(),
  archived_at: z.number().nullable(),
  parent_feature_id: z.string().nullable(),
  provider_metadata: z.record(z.string(), z.unknown()).nullable(),
  consumer_default_enabled: z.boolean(),
  scope: z.string(),
  app_id: z.string().nullable(),
  synced_at: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
})

export const sdk876FeatureListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(sdk876FeatureSchema),
  has_more: z.boolean(),
  url: z.string(),
  total_count: z.number().int().nullable().optional(),
})

export type Feature = z.infer<typeof sdk876FeatureSchema>
export type FeatureList = z.infer<typeof sdk876FeatureListSchema>
export type FeatureListResult = Result<FeatureList>
