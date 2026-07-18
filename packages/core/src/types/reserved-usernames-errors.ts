import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const reservedUsernameErrorCodeValues = [
  'reserved_username/already-exists',
  'reserved_username/not-found',
] as const

export const reservedUsernameErrorCodeSchema = z.enum(
  reservedUsernameErrorCodeValues
)

/**
 * Stable app-owned error code for reserved username operations.
 */
export type ReservedUsernameErrorCode = z.infer<
  typeof reservedUsernameErrorCodeSchema
>

export const reservedUsernameServiceErrorSchema = z.strictObject({
  code: reservedUsernameErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<ReservedUsernameErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<ReservedUsernameErrorCode>>

export type ReservedUsernameServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<ReservedUsernameErrorCode>
>
