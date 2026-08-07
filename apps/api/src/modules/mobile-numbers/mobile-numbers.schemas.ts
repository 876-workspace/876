import { z } from 'zod'

/**
 * Mobile numbers — the user's canonical phone numbers and their
 * provider-owned verification lifecycle.
 */

export const MOBILE_NUMBER_TYPES = ['mobile', 'home', 'work', 'other'] as const

export const VERIFICATION_CHANNELS = ['sms', 'call', 'whatsapp'] as const

export const mobileNumberSchema = z
  .object({
    object: z
      .literal('mobile_number')
      .meta({ description: "Always 'mobile_number'." }),
    id: z.string(),
    user_id: z.string(),
    number: z.string(),
    type: z.string(),
    is_primary: z.boolean(),
    verification_status: z.string(),
    verification_id: z.string().nullable(),
    verified_at: z.number().int().nullable(),
    carrier_name: z.string().nullable(),
    line_type: z.string().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'MobileNumber' })

export const mobileNumberDeletedSchema = z
  .object({
    object: z.literal('mobile_number'),
    id: z.string(),
    deleted: z.literal(true),
  })
  .meta({ id: 'MobileNumberDeleted' })

export const mobileNumberVerificationSchema = z
  .object({
    object: z
      .literal('mobile_number_verification')
      .meta({ description: "Always 'mobile_number_verification'." }),
    id: z.string(),
    mobile_number_id: z.string(),
    provider: z.string().nullable(),
    provider_sid: z.string().nullable(),
    channel: z.string().nullable(),
    status: z.string().nullable(),
    attempt_count: z.number().int(),
    last_sent_at: z.number().int().nullable(),
    can_resend_at: z.number().int().nullable(),
    verified_at: z.number().int().nullable(),
    expires_at: z.number().int(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'MobileNumberVerification' })

export const createMobileNumberBodySchema = z.strictObject({
  number: z.string().min(1).max(64),
  type: z.enum(MOBILE_NUMBER_TYPES).default('mobile'),
})

export const updateMobileNumberBodySchema = z.strictObject({
  type: z.enum(MOBILE_NUMBER_TYPES).optional(),
})

export const createVerificationBodySchema = z.strictObject({
  channel: z.enum(VERIFICATION_CHANNELS),
})

/**
 * Accepts both `make_primary` and `makePrimary` — the Python schema declares
 * `alias="makePrimary"` with `populate_by_name=True`, so production callers
 * already send the camelCase form.
 */
export const approveVerificationBodySchema = z
  .strictObject({
    code: z.string().min(1).max(32),
    make_primary: z.boolean().optional(),
    makePrimary: z.boolean().optional(),
  })
  .transform((body) => ({
    code: body.code,
    make_primary: body.makePrimary ?? body.make_primary ?? false,
  }))

export const mobileNumberIdParamsSchema = z.strictObject({
  mobile_number_id: z.string(),
})

export const verificationApproveParamsSchema = z.strictObject({
  mobile_number_id: z.string(),
  verification_id: z.string(),
})

export type MobileNumber = z.infer<typeof mobileNumberSchema>
export type MobileNumberVerification = z.infer<
  typeof mobileNumberVerificationSchema
>
export type CreateMobileNumberBody = z.infer<
  typeof createMobileNumberBodySchema
>
export type UpdateMobileNumberBody = z.infer<
  typeof updateMobileNumberBodySchema
>
export type CreateVerificationBody = z.infer<
  typeof createVerificationBodySchema
>
export type ApproveVerificationBody = z.output<
  typeof approveVerificationBodySchema
>
export type MobileNumberType = (typeof MOBILE_NUMBER_TYPES)[number]
export type VerificationChannel = (typeof VERIFICATION_CHANNELS)[number]
