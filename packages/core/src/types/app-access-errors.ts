import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const appAccessErrorCodeValues = [
  'app-access/internal-error',
  'app-membership/app-not-assignable',
  'app-membership/duplicate',
  'app-membership/not-a-member',
  'app-membership/not-entitled',
  'app-membership/not-found',
  'app-permission/duplicate',
  'app-permission/not-found',
  'app-role/default-required',
  'app-role/duplicate-key',
  'app-role/in-use',
  'app-role/last-admin',
  'app-role/not-found',
  'app-role/system-immutable',
  'app-role/unknown-permission',
] as const

export const appAccessErrorCodeSchema = z.enum(appAccessErrorCodeValues)

/** Stable app-access error code. */
export type AppAccessErrorCode = z.infer<typeof appAccessErrorCodeSchema>

export const appAccessServiceErrorSchema = z.strictObject({
  code: appAccessErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<AppAccessErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<AppAccessErrorCode>>

export type AppAccessServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<AppAccessErrorCode>
>
