import * as z from 'zod'

import type { Result } from './api.ts'

const mobileNumberTypeSchema = z.enum(['mobile', 'home', 'work', 'other'])
const verificationChannelSchema = z.enum(['sms', 'call', 'whatsapp'])

/** A canonical E.164 mobile number belonging to the current user. */
export const mobileNumberSchema = z.strictObject({
  object: z.literal('mobile_number'),
  id: z.string().min(1),
  user_id: z.string().min(1),
  number: z.string().regex(/^\+[1-9]\d{7,14}$/),
  type: mobileNumberTypeSchema,
  is_primary: z.boolean(),
  // Always serialized by the API, null until a Lookup resolves them. Omitting
  // them from a strictObject rejects every real response as auth/invalid-response.
  carrier_name: z.string().nullable(),
  line_type: z.string().nullable(),
  verification_status: z.string(),
  verification_id: z.string().nullable(),
  verified_at: z.number().int().nullable(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

/** A provider-owned verification challenge. It never includes an OTP value. */
export const mobileNumberVerificationSchema = z.strictObject({
  object: z.literal('mobile_number_verification'),
  id: z.string().min(1),
  mobile_number_id: z.string().min(1),
  provider: z.string().nullable(),
  provider_sid: z.string().nullable(),
  channel: verificationChannelSchema.nullable(),
  status: z.string().nullable(),
  attempt_count: z.number().int().nonnegative(),
  last_sent_at: z.number().int().nullable(),
  can_resend_at: z.number().int().nullable(),
  verified_at: z.number().int().nullable(),
  expires_at: z.number().int(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export const mobileNumberListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(mobileNumberSchema),
  has_more: z.boolean(),
  url: z.string(),
  total_count: z.number().int().nullable(),
})

export const mobileNumberCreateParamsSchema = z.strictObject({
  number: z.string().trim().min(1).max(64),
  type: mobileNumberTypeSchema.optional(),
})

export const mobileNumberUpdateParamsSchema = z.strictObject({
  type: mobileNumberTypeSchema.optional(),
})

export const mobileNumberVerificationCreateParamsSchema = z.strictObject({
  channel: verificationChannelSchema,
})

export const mobileNumberVerificationApproveParamsSchema = z.strictObject({
  code: z.string().trim().min(1).max(32),
  makePrimary: z.boolean().optional(),
})

export const deletedMobileNumberSchema = z.strictObject({
  object: z.literal('mobile_number'),
  id: z.string().min(1),
  deleted: z.literal(true),
})

export type MobileNumber = z.infer<typeof mobileNumberSchema>
export type MobileNumberVerification = z.infer<
  typeof mobileNumberVerificationSchema
>
export type MobileNumberList = z.infer<typeof mobileNumberListSchema>
export type MobileNumberCreateParams = z.input<
  typeof mobileNumberCreateParamsSchema
>
export type MobileNumberUpdateParams = z.input<
  typeof mobileNumberUpdateParamsSchema
>
export type MobileNumberVerificationCreateParams = z.input<
  typeof mobileNumberVerificationCreateParamsSchema
>
export type MobileNumberVerificationApproveParams = z.input<
  typeof mobileNumberVerificationApproveParamsSchema
>
export type DeletedMobileNumber = z.infer<typeof deletedMobileNumberSchema>
export type MobileNumberResult = Result<MobileNumber>
export type MobileNumberListResult = Result<MobileNumberList>
export type DeletedMobileNumberResult = Result<DeletedMobileNumber>
export type MobileNumberVerificationResult = Result<MobileNumberVerification>
