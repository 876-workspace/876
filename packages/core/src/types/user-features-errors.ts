import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const userFeatureErrorCodeValues = [
  'user-feature/not-found',
  'user-feature/not-synced',
] as const

export const userFeatureErrorCodeSchema = z.enum(userFeatureErrorCodeValues)

/**
 * Stable app-owned error code for user feature operations.
 */
export type UserFeatureErrorCode = z.infer<typeof userFeatureErrorCodeSchema>

export const userFeatureServiceErrorSchema = z.strictObject({
  code: userFeatureErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<UserFeatureErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<UserFeatureErrorCode>>

export type UserFeatureServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<UserFeatureErrorCode>
>
