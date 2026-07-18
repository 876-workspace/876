import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const membershipErrorCodeValues = [
  'membership/duplicate',
  'membership/internal-error',
  'membership/not-found',
  'membership/not-in-organization',
  'membership/user-not-enterprise',
  'membership/validation-failed',
] as const

export const membershipErrorCodeSchema = z.enum(membershipErrorCodeValues)

export type MembershipErrorCode = z.infer<typeof membershipErrorCodeSchema>

export const membershipServiceErrorSchema = z.strictObject({
  code: membershipErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<MembershipErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<MembershipErrorCode>>

export type MembershipServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<MembershipErrorCode>
>
