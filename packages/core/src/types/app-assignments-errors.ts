import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const appAssignmentErrorCodeValues = [
  'app-assignment/app-not-found',
  'app-assignment/member-not-found',
  'app-assignment/not-found',
  'app-assignment/not-provisioned',
  'app-assignment/validation-failed',
] as const

export const appAssignmentErrorCodeSchema = z.enum(appAssignmentErrorCodeValues)

/**
 * Stable app-owned error code for app assignment operations.
 */
export type AppAssignmentErrorCode = z.infer<
  typeof appAssignmentErrorCodeSchema
>

export const appAssignmentServiceErrorSchema = z.strictObject({
  code: appAssignmentErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<AppAssignmentErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<AppAssignmentErrorCode>>

export type AppAssignmentServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<AppAssignmentErrorCode>
>
