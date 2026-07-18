import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const locationErrorCodeValues = [
  'location/not-found',
  'location/not-in-organization',
] as const

export const locationErrorCodeSchema = z.enum(locationErrorCodeValues)

/**
 * Stable app-owned error code for location operations.
 */
export type LocationErrorCode = z.infer<typeof locationErrorCodeSchema>

export const locationServiceErrorSchema = z.strictObject({
  code: locationErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<LocationErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<LocationErrorCode>>

export type LocationServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<LocationErrorCode>
>
