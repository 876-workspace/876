import { z } from 'zod'

import { paginationQuerySchema } from '@/http/envelope'

/**
 * Sessions — the admin surface over established logins.
 */

export const SESSION_STATUSES = ['active', 'revoked', 'expired'] as const

export const sessionSchema = z
  .object({
    object: z.literal('session').meta({ description: "Always 'session'." }),
    id: z.string(),
    userId: z.string(),
    appId: z.string().nullable(),
    expiresAt: z.number().int(),
    ipAddress: z.string().nullable(),
    userAgent: z.string().nullable(),
    deviceId: z.string().nullable(),
    ip_country_code: z.string().nullable(),
    ip_region: z.string().nullable(),
    ip_city: z.string().nullable(),
    ip_asn: z.string().nullable(),
    ip_as_organization: z.string().nullable(),
    lastSeenAt: z.number().int().nullable(),
    revoked_at: z.number().int().nullable(),
    revoked_by: z.string().nullable(),
    createdAt: z.number().int(),
    updatedAt: z.number().int(),
  })
  .meta({ id: 'Session' })

export const sessionDeletedSchema = z
  .object({
    object: z.literal('session'),
    id: z.string(),
    deleted: z.literal(true),
  })
  .meta({ id: 'SessionDeleted' })

export const userSessionsDeletedSchema = z
  .object({
    object: z.literal('session_list'),
    userId: z.string(),
    deleted: z.literal(true),
    revoked_count: z.number().int(),
  })
  .meta({ id: 'UserSessionsDeleted' })

/**
 * `status` is the precise filter — `active` (unexpired and unrevoked),
 * `revoked` (cut off deliberately), `expired` (simply timed out). Revoked and
 * expired are genuinely different facts: one is an administrative act, the other
 * is the clock.
 *
 * `active` is the coarse two-state form kept for existing callers; `status`
 * wins when both are given.
 */
export const listSessionsQuerySchema = paginationQuerySchema.extend({
  userId: z.string().optional(),
  deviceId: z.string().optional(),
  active: z.stringbool().optional(),
  status: z.enum(SESSION_STATUSES).optional(),
})

export const listUserSessionsQuerySchema = paginationQuerySchema.extend({
  active: z.stringbool().optional(),
  status: z.enum(SESSION_STATUSES).optional(),
})

export const sessionIdParamsSchema = z.strictObject({
  sessionId: z.string(),
})

export const userIdParamsSchema = z.strictObject({
  userId: z.string(),
})

export type Session = z.infer<typeof sessionSchema>
export type SessionStatus = (typeof SESSION_STATUSES)[number]
export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>
export type ListUserSessionsQuery = z.infer<typeof listUserSessionsQuerySchema>
