import { z } from 'zod'

export const deviceSchema = z
  .object({
    object: z.literal('kiosk_device'),
    id: z.string(),
    tenant_id: z.string(),
    branch_id: z.string(),
    name: z.string(),
    status: z.enum(['ACTIVE', 'REVOKED']),
    last_used_at: z.number().int().nullable(),
    revoked_at: z.number().int().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'KioskDevice' })
export const enrollmentSchema = z
  .object({
    object: z.literal('kiosk_device_enrollment'),
    device: deviceSchema,
    credential: z.string().regex(/^kdev_/),
  })
  .meta({ id: 'KioskDeviceEnrollment' })
export const pickupChallengeSchema = z
  .object({
    object: z.literal('package_pickup_challenge'),
    package_id: z.string(),
    code: z.string().regex(/^\d{6}$/),
    expires_at: z.number().int(),
  })
  .meta({ id: 'PackagePickupChallenge' })
export const pickupPackageSchema = z
  .object({
    object: z.literal('kiosk_package'),
    id: z.string(),
    tracking_number: z.string().nullable(),
    description: z.string().nullable(),
    status: z.enum(['READY_FOR_PICKUP', 'COLLECTED']),
    quantity: z.number().int(),
  })
  .meta({ id: 'KioskPackage' })
export const tenantParamsSchema = z.strictObject({
  tenantId: z.string().min(1),
})
export const deviceParamsSchema = tenantParamsSchema.extend({
  id: z.string().min(1),
})
export const enrollBodySchema = z.strictObject({
  branch_id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
})
export const lookupQuerySchema = z.strictObject({
  mailbox_number: z.string().trim().min(1).max(64),
  pickup_code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
})
export const collectionParamsSchema = z.strictObject({ id: z.string().min(1) })
export const pickupChallengeParamsSchema = tenantParamsSchema.extend({
  packageId: z.string().min(1),
})
export const createPickupChallengeBodySchema = z.strictObject({
  expires_in_seconds: z.number().int().min(60).max(86_400).default(900),
})
export const collectBodySchema = z.strictObject({
  pickup_code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
})
export type Device = z.infer<typeof deviceSchema>
export type TenantParams = z.infer<typeof tenantParamsSchema>
export type DeviceParams = z.infer<typeof deviceParamsSchema>
export type EnrollBody = z.infer<typeof enrollBodySchema>
export type LookupQuery = z.infer<typeof lookupQuerySchema>
export type CollectionParams = z.infer<typeof collectionParamsSchema>
export type CollectBody = z.infer<typeof collectBodySchema>
export type PickupChallengeParams = z.infer<typeof pickupChallengeParamsSchema>
export type CreatePickupChallengeBody = z.infer<
  typeof createPickupChallengeBodySchema
>
