import type { Request } from 'express'

import type { IdempotencyContext } from '@/types/commerce'
import { AppHttpError } from '@/platform/errors'
import { idempotencyHash } from '@/platform/idempotency'

function commandIdempotency(
  rawKey: string | undefined,
  payload: Record<string, unknown>,
  required: boolean
): IdempotencyContext | undefined {
  if (rawKey === undefined && !required) return undefined

  const key = rawKey?.trim() ?? ''
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

/**
 * Builds optional command replay context from a trusted header and already
 * validated command payload. The resource path must be included by the caller.
 */
export function optionalCommandIdempotency(
  req: Request,
  payload: Record<string, unknown>
): IdempotencyContext | undefined {
  return commandIdempotency(req.header('idempotency-key'), payload, false)
}

/**
 * Builds mandatory command replay context for operations with irreversible
 * external side effects such as transactional email delivery.
 */
export function requiredCommandIdempotency(
  req: Request,
  payload: Record<string, unknown>
): IdempotencyContext {
  return commandIdempotency(
    req.header('idempotency-key'),
    payload,
    true
  ) as IdempotencyContext
}
