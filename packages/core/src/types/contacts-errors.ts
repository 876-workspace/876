import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const contactErrorCodeValues = [
  'contact/already-exists',
  'contact/not-found',
  'contact/self-contact',
  'contact/user-not-member',
] as const

export const contactErrorCodeSchema = z.enum(contactErrorCodeValues)

/**
 * Stable app-owned error code for contact operations.
 */
export type ContactErrorCode = z.infer<typeof contactErrorCodeSchema>

export const contactServiceErrorSchema = z.strictObject({
  code: contactErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<ContactErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<ContactErrorCode>>

export type ContactServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<ContactErrorCode>
>
