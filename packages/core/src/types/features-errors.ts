import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const featureErrorCodeValues = [
  'feature/duplicate',
  'feature/internal-error',
  'feature/not-found',
  'feature/org-not-found',
  'feature/scope-mismatch',
  'feature/user-not-found',
  'feature/validation-failed',
  'feature/workos-error',
] as const

export const featureErrorCodeSchema = z.enum(featureErrorCodeValues)

export type FeatureErrorCode = z.infer<typeof featureErrorCodeSchema>

export const featureServiceErrorSchema = z.strictObject({
  code: featureErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<FeatureErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<FeatureErrorCode>>

export type FeatureServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<FeatureErrorCode>
>
