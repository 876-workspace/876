import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const profileErrorCodeValues = [
  'profile/already-exists',
  'profile/not-found',
] as const

export const profileErrorCodeSchema = z.enum(profileErrorCodeValues)

/**
 * Stable app-owned error code for profile operations.
 */
export type ProfileErrorCode = z.infer<typeof profileErrorCodeSchema>

export const profileServiceErrorSchema = z.strictObject({
  code: profileErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<ProfileErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<ProfileErrorCode>>

export type ProfileServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<ProfileErrorCode>
>
