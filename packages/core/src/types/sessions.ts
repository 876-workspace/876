import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'
import type { SessionErrorCode } from './sessions-errors'

export const sessionCreateParamsSchema = z.strictObject({
  userId: z.string().trim().min(1),
  appId: z.string().trim().min(1).optional(),
  token: z.string().trim().min(1).optional(),
  expiresAt: z.int().nonnegative(),
  ipAddress: z.string().trim().optional(),
  userAgent: z.string().trim().optional(),
})

export type Session = {
  object: 'session'
  id: string
  userId: string
  appId: string | null
  token: string | null
  tokenHash: string
  expiresAt: number
  ipAddress: string | null
  userAgent: string | null
  createdAt: number
  updatedAt: number
}

export type SessionCreateParams = z.input<typeof sessionCreateParamsSchema>

export type SessionServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<SessionErrorCode>
>
