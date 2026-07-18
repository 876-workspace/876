import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const inviteErrorCodeValues = [
  'invite/app-not-found',
  'invite/email-mismatch',
  'invite/not-found',
  'invite/user-not-found',
] as const

export const inviteErrorCodeSchema = z.enum(inviteErrorCodeValues)

/**
 * Stable app-owned error code for invite operations.
 */
export type InviteErrorCode = z.infer<typeof inviteErrorCodeSchema>

export const inviteServiceErrorSchema = z.strictObject({
  code: inviteErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<InviteErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<InviteErrorCode>>

export type InviteServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<InviteErrorCode>
>
