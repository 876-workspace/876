import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const accountErrorCodeValues = [
  'account/duplicate',
  'account/internal-error',
  'account/not-found',
  'account/validation-failed',
] as const

export const accountErrorCodeSchema = z.enum(accountErrorCodeValues)

export type AccountErrorCode = z.infer<typeof accountErrorCodeSchema>

export const accountServiceErrorSchema = z.strictObject({
  code: accountErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<AccountErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<AccountErrorCode>>

export type AccountServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<AccountErrorCode>
>
