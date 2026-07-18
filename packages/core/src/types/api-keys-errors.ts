import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const apiKeyErrorCodeValues = [
  'api-key/duplicate',
  'api-key/expired',
  'api-key/internal-error',
  'api-key/invalid',
  'api-key/missing',
  'api-key/not-found',
  'api-key/revoked',
  'api-key/validation-failed',
] as const

export const apiKeyErrorCodeSchema = z.enum(apiKeyErrorCodeValues)

/**
 * Stable app-owned error code for API key operations.
 */
export type ApiKeyErrorCode = z.infer<typeof apiKeyErrorCodeSchema>

export const apiKeyServiceErrorSchema = z.strictObject({
  code: apiKeyErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<ApiKeyErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<ApiKeyErrorCode>>

/**
 * Result type returned by API key services.
 */
export type ApiKeyServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<ApiKeyErrorCode>
>
