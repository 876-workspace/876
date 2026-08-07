import { z } from 'zod'

import { paginationQuerySchema } from '@/http/envelope'

/**
 * The authentication attempt history — every login, verification, and refusal,
 * with the network and device context it happened in.
 */

export const SUMMARY_WINDOWS = ['24h', '7d', '30d'] as const

export const authAttemptSchema = z
  .object({
    object: z
      .literal('auth_attempt')
      .meta({ description: "Always 'auth_attempt'." }),
    id: z.string(),
    event: z.string(),
    outcome: z.string(),
    failure_code: z.string().nullable(),
    identifier: z.string().nullable(),
    user_id: z.string().nullable(),
    app_id: z.string().nullable(),
    session_id: z.string().nullable(),
    realm: z.string().nullable(),
    device_id: z.string().nullable(),
    device_fingerprint: z.string().nullable(),
    ip_address: z.string().nullable(),
    ip_country_code: z.string().nullable(),
    ip_region_code: z.string().nullable(),
    ip_region: z.string().nullable(),
    ip_city: z.string().nullable(),
    ip_postal_code: z.string().nullable(),
    ip_timezone: z.string().nullable(),
    ip_latitude: z.string().nullable(),
    ip_longitude: z.string().nullable(),
    ip_asn: z.string().nullable(),
    ip_as_organization: z.string().nullable(),
    user_agent: z.string().nullable(),
    device_type: z.string().nullable(),
    device_brand: z.string().nullable(),
    device_model: z.string().nullable(),
    os_name: z.string().nullable(),
    os_version: z.string().nullable(),
    browser_name: z.string().nullable(),
    browser_version: z.string().nullable(),
    is_bot: z.boolean(),
    context_trusted: z.boolean(),
    risk_score: z.number().int().nullable(),
    risk_reasons: z.array(z.string()).nullable(),
    request_id: z.string().nullable(),
    created_at: z.number().int(),
  })
  .meta({ id: 'AuthAttempt' })

const summaryItemSchema = z.object({
  value: z.string(),
  count: z.number().int(),
})

export const authAttemptSummarySchema = z
  .object({
    object: z.literal('auth_attempt_summary'),
    window: z.enum(SUMMARY_WINDOWS),
    total: z.number().int(),
    outcomes: z.record(z.string(), z.number().int()),
    top_countries: z.array(summaryItemSchema),
    top_failure_codes: z.array(summaryItemSchema),
    top_failure_ips: z.array(summaryItemSchema),
  })
  .meta({ id: 'AuthAttemptSummary' })

export const summaryQuerySchema = z.object({
  window: z.enum(SUMMARY_WINDOWS).default('24h'),
})

export const listAuthAttemptsQuerySchema = paginationQuerySchema.extend({
  user_id: z.string().optional(),
  identifier: z.string().optional(),
  event: z.string().optional(),
  outcome: z.string().optional(),
  ip_address: z.string().optional(),
  ip_country_code: z.string().optional(),
  device_fingerprint: z.string().optional(),
  app_id: z.string().optional(),
  created_after: z.coerce.number().int().optional(),
  created_before: z.coerce.number().int().optional(),
  q: z.string().optional(),
})

export const attemptIdParamsSchema = z.strictObject({ attempt_id: z.string() })
export const userIdParamsSchema = z.strictObject({ user_id: z.string() })

export type AuthAttempt = z.infer<typeof authAttemptSchema>
export type AuthAttemptSummary = z.infer<typeof authAttemptSummarySchema>
export type SummaryWindow = (typeof SUMMARY_WINDOWS)[number]
export type ListAuthAttemptsQuery = z.infer<typeof listAuthAttemptsQuerySchema>
