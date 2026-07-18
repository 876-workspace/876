import * as z from 'zod'

import {
  analyticsPropertiesSchema,
  type AnalyticsProperties,
} from '@876/types/analytics'
import type { AuthError } from './api.ts'

const optionalStringSchema = z.string().trim().min(1).nullable().optional()

export const sdk876AuditEventCreateParamsSchema = z.strictObject({
  event: z.string().trim().min(1).max(120),
  source: z.string().trim().min(1).max(40).optional(),
  app_name: z.string().trim().min(1).max(80),
  user_id: optionalStringSchema,
  path: optionalStringSchema,
  search: optionalStringSchema,
  referrer: optionalStringSchema,
  title: optionalStringSchema,
  request_id: optionalStringSchema,
  session_id: optionalStringSchema,
  distinct_id: optionalStringSchema,
  properties: analyticsPropertiesSchema.optional(),
})

export const sdk876AuditEventSchema = z.strictObject({
  object: z.literal('audit_event'),
  id: z.string(),
  event: z.string(),
  source: z.string(),
  app_name: z.string(),
  app_id: z.string().nullable(),
  user_id: z.string().nullable(),
  path: z.string().nullable(),
  search: z.string().nullable(),
  referrer: z.string().nullable(),
  title: z.string().nullable(),
  request_id: z.string().nullable(),
  session_id: z.string().nullable(),
  distinct_id: z.string().nullable(),
  properties: analyticsPropertiesSchema,
  created_at: z.number(),
})

export const sdk876AuditEventListSchema = apiListSchema(sdk876AuditEventSchema)

export type AuditEventCreateParams = z.infer<
  typeof sdk876AuditEventCreateParamsSchema
>

export type AuditEvent = z.infer<typeof sdk876AuditEventSchema>

export type AuditEventResult = {
  data: AuditEvent | null
  error: AuthError | null
}

export type AuditEventList = {
  object: 'list'
  data: AuditEvent[]
  has_more: boolean
  total_count?: number | null
  url: string
}

export type AuditEventListResult = {
  data: AuditEventList | null
  error: AuthError | null
}

export type { AnalyticsProperties }

function apiListSchema<TItem>(itemSchema: z.ZodType<TItem>) {
  return z.strictObject({
    object: z.literal('list'),
    data: z.array(itemSchema),
    has_more: z.boolean(),
    total_count: z.number().nullable().optional(),
    url: z.string(),
  })
}
