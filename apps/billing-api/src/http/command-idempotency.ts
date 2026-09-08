import type { Request } from 'express'

import type { IdempotencyContext } from '@/types/commerce'
import { AppHttpError } from '@/platform/errors'
import { idempotencyHash } from '@/platform/idempotency'

/**
 * Builds optional command replay context from a trusted header and already
 * validated command payload. The resource path must be included by the caller.
 */
export function optionalCommandIdempotency(
  req: Request,
  payload: Record<string, unknown>
): IdempotencyContext | undefined {
  const rawKey = req.header('idempotency-key')
  if (rawKey === undefined) return undefined

  const key = rawKey.trim()
  if (key.length < 1 || key.length > 255)
    throw new AppHttpError({
      code: 'billing/idempotency-key-required',
      message: 'Provide an Idempotency-Key header between 1 and 255 characters.',
      httpStatus: 400,
    })

  return {
    key,
    requestHash: idempotencyHash(JSON.stringify(payload)),
  }
}
