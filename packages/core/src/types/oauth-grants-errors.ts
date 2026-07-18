import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const oAuthGrantErrorCodeValues = ['oauth-grant/not-found'] as const

export const oAuthGrantErrorCodeSchema = z.enum(oAuthGrantErrorCodeValues)

/**
 * Stable app-owned error code for OAuth grant operations.
 */
export type OAuthGrantErrorCode = z.infer<typeof oAuthGrantErrorCodeSchema>

export const oAuthGrantServiceErrorSchema = z.strictObject({
  code: oAuthGrantErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<OAuthGrantErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<OAuthGrantErrorCode>>

export type OAuthGrantServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<OAuthGrantErrorCode>
>
