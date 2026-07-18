import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const subscriptionErrorCodeValues = [
  'subscription/app-required',
  'subscription/not-found',
  'subscription/update-required',
] as const

export const subscriptionErrorCodeSchema = z.enum(subscriptionErrorCodeValues)

/**
 * Stable app-owned error code for subscription operations.
 */
export type SubscriptionErrorCode = z.infer<typeof subscriptionErrorCodeSchema>

export const subscriptionServiceErrorSchema = z.strictObject({
  code: subscriptionErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<SubscriptionErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<SubscriptionErrorCode>>

export type SubscriptionServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<SubscriptionErrorCode>
>
