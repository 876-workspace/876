import { z } from 'zod'

import { paginationQuerySchema } from '@/http/envelope'

/**
 * The user device registry.
 *
 * A device resource carries only derived identity — type, brand, OS, browser.
 * The raw `signal.components` the fingerprint was computed from is never
 * serialized: it is the collection material, and publishing it would let anyone
 * with read access reconstruct or forge a fingerprint.
 */

export const deviceSchema = z
  .object({
    object: z.literal('device').meta({ description: "Always 'device'." }),
    id: z.string(),
    user_id: z.string(),
    fingerprint: z.string(),
    confidence: z.string(),
    device_type: z.string(),
    device_brand: z.string().nullable(),
    device_model: z.string().nullable(),
    os_name: z.string().nullable(),
    os_version: z.string().nullable(),
    browser_name: z.string().nullable(),
    browser_version: z.string().nullable(),
    is_bot: z.boolean(),
    label: z.string().nullable(),
    trusted: z.boolean(),
    trusted_at: z.number().int().nullable(),
    trusted_by: z.string().nullable(),
    blocked_at: z.number().int().nullable(),
    blocked_by: z.string().nullable(),
    block_reason: z.string().nullable(),
    first_seen_at: z.number().int(),
    last_seen_at: z.number().int(),
    last_ip: z.string().nullable(),
    last_country_code: z.string().nullable(),
    sign_in_count: z.number().int(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'Device' })

export const deviceUserSchema = z
  .object({
    object: z.literal('device_user'),
    user_id: z.string(),
    device_id: z.string(),
    first_seen_at: z.number().int(),
    last_seen_at: z.number().int(),
    sign_in_count: z.number().int(),
  })
  .meta({ id: 'DeviceUser' })

export const updateDeviceBodySchema = z.strictObject({
  label: z.string().max(120).optional(),
  trusted: z.boolean().optional(),
  blocked: z.boolean().optional(),
  block_reason: z.string().max(500).optional(),
})

export const listDevicesQuerySchema = paginationQuerySchema.extend({
  user_id: z.string().optional(),
  fingerprint: z.string().optional(),
  device_type: z.string().optional(),
  trusted: z.stringbool().optional(),
  blocked: z.stringbool().optional(),
  q: z.string().optional(),
})

export const deviceIdParamsSchema = z.strictObject({ device_id: z.string() })
export const userIdParamsSchema = z.strictObject({ user_id: z.string() })

export type Device = z.infer<typeof deviceSchema>
export type DeviceUser = z.infer<typeof deviceUserSchema>
export type UpdateDeviceBody = z.infer<typeof updateDeviceBodySchema>
export type ListDevicesQuery = z.infer<typeof listDevicesQuerySchema>
