import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const userErrorCodeValues = [
  'user/duplicate-email',
  'user/duplicate-stripe-customer-id',
  'user/duplicate-username',
  'user/duplicate-workos-id',
  'user/internal-error',
  'user/invalid-username',
  'user/not-found',
  'user/provider-error',
  'user/username-unavailable',
  'user/validation-failed',
] as const

export const userErrorCodeSchema = z.enum(userErrorCodeValues)

/**
 * Stable app-owned error code for user operations.
 */
export type UserErrorCode = z.infer<typeof userErrorCodeSchema>

export const userServiceErrorSchema = z.strictObject({
  code: userErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<UserErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<UserErrorCode>>

/**
 * Result type returned by user services.
 */
export type UserServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<UserErrorCode>
>
