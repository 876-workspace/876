import * as z from 'zod'

import {
  analyticsPropertiesSchema,
  type AnalyticsProperties,
} from '@876/types/analytics'
import type { AuthError } from './api.ts'

const optionalStringSchema = z.string().trim().min(1).nullable().optional()

/**
 * Public create params are camelCase; the resource maps them onto the
 * snake_case wire contract before sending.
 */
export const sdk876AuditEventCreateParamsSchema = z.strictObject({
  event: z.string().trim().min(1).max(120),
  source: z.string().trim().min(1).max(40).optional(),
  appName: z.string().trim().min(1).max(80),
  userId: optionalStringSchema,
  path: optionalStringSchema,
  search: optionalStringSchema,
  referrer: optionalStringSchema,
  title: optionalStringSchema,
  requestId: optionalStringSchema,
  sessionId: optionalStringSchema,
  distinctId: optionalStringSchema,
  properties: analyticsPropertiesSchema.optional(),
})

export const sdk876AuditEventSchema = z.strictObject({
  object: z.literal('audit_event'),
  id: z.string(),
  event: z.string(),
  source: z.string(),
  appName: z.string(),
  appId: z.string().nullable(),
  userId: z.string().nullable(),
  path: z.string().nullable(),
  search: z.string().nullable(),
  referrer: z.string().nullable(),
  title: z.string().nullable(),
  requestId: z.string().nullable(),
  sessionId: z.string().nullable(),
  distinctId: z.string().nullable(),
  properties: analyticsPropertiesSchema,
  createdAt: z.number(),
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
  hasMore: boolean
  totalCount?: number | null
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
    hasMore: z.boolean(),
    totalCount: z.number().nullable().optional(),
    url: z.string(),
  })
}
