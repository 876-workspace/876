import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const roleErrorCodeValues = [
  'role/duplicate-name',
  'role/in-use',
  'role/last-owner',
  'role/not-found',
  'role/owner-required',
  'role/system-immutable',
  'role/unknown-permission',
] as const

export const roleErrorCodeSchema = z.enum(roleErrorCodeValues)

/**
 * Stable app-owned error code for role operations.
 */
export type RoleErrorCode = z.infer<typeof roleErrorCodeSchema>

export const roleServiceErrorSchema = z.strictObject({
  code: roleErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<RoleErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<RoleErrorCode>>

export type RoleServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<RoleErrorCode>
>
