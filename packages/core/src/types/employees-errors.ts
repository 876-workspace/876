import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const employeeErrorCodeValues = [
  'employee/duplicate-membership',
  'employee/not-found',
] as const

export const employeeErrorCodeSchema = z.enum(employeeErrorCodeValues)

/**
 * Stable app-owned error code for employee operations.
 */
export type EmployeeErrorCode = z.infer<typeof employeeErrorCodeSchema>

export const employeeServiceErrorSchema = z.strictObject({
  code: employeeErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<EmployeeErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<EmployeeErrorCode>>

export type EmployeeServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<EmployeeErrorCode>
>
