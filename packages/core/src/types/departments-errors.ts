import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const departmentErrorCodeValues = [
  'department/invalid-parent',
  'department/not-found',
  'department/not-in-organization',
  'department/parent-not-in-organization',
] as const

export const departmentErrorCodeSchema = z.enum(departmentErrorCodeValues)

/**
 * Stable app-owned error code for department operations.
 */
export type DepartmentErrorCode = z.infer<typeof departmentErrorCodeSchema>

export const departmentServiceErrorSchema = z.strictObject({
  code: departmentErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<DepartmentErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<DepartmentErrorCode>>

export type DepartmentServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<DepartmentErrorCode>
>
