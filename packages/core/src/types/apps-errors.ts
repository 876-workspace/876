import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const appErrorCodeValues = ['app/not-found'] as const

export const appErrorCodeSchema = z.enum(appErrorCodeValues)

/**
 * Stable app-owned error code for app operations.
 */
export type AppErrorCode = z.infer<typeof appErrorCodeSchema>

export const appServiceErrorSchema = z.strictObject({
  code: appErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<AppErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<AppErrorCode>>

export type AppServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<AppErrorCode>
>
