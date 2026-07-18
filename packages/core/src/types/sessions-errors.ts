import * as z from 'zod'

import type { Error } from './errors'

export const sessionErrorCodeValues = [
  'session/expired',
  'session/internal-error',
  'session/invalid',
  'session/not-found',
  'session/validation-failed',
] as const

export const sessionErrorCodeSchema = z.enum(sessionErrorCodeValues)

export type SessionErrorCode = z.infer<typeof sessionErrorCodeSchema>

export const sessionServiceErrorSchema = z.strictObject({
  code: sessionErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<SessionErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<SessionErrorCode>>
