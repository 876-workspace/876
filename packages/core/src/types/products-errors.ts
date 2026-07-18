import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const productErrorCodeValues = [
  'product/duplicate-slug',
  'product/no-updates',
  'product/not-found',
] as const

export const productErrorCodeSchema = z.enum(productErrorCodeValues)

/**
 * Stable app-owned error code for product operations.
 */
export type ProductErrorCode = z.infer<typeof productErrorCodeSchema>

export const productServiceErrorSchema = z.strictObject({
  code: productErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<ProductErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<ProductErrorCode>>

export type ProductServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<ProductErrorCode>
>
