import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const addressErrorCodeValues = ['address/not-found'] as const

export const addressErrorCodeSchema = z.enum(addressErrorCodeValues)

/**
 * Stable app-owned error code for address operations.
 */
export type AddressErrorCode = z.infer<typeof addressErrorCodeSchema>

export const addressServiceErrorSchema = z.strictObject({
  code: addressErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<AddressErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<AddressErrorCode>>

export type AddressServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<AddressErrorCode>
>
