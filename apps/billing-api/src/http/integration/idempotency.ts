import type { Request } from 'express'

import type { BillingPrincipal } from '@/http/auth'
import { AppHttpError } from '@/http/errors'
import { rawJsonBody } from '@/http/middleware/raw-body'
import { integrationPayloadHash } from '@/platform/idempotency'

export type IntegrationAttribution = {
  sourceAppId: string
  sourceExternalReference: string | null
  sourceIdempotencyKey: string
  sourcePayloadHash: string
}

export function integrationAttribution(
  req: Request,
  principal: BillingPrincipal,
  body: Record<string, unknown>
): IntegrationAttribution | null {
  const sourceExternalReference =
    typeof body.sourceExternalReference === 'string'
      ? body.sourceExternalReference
      : null

  if (principal.platformAdmin) {
    if (sourceExternalReference !== null) {
      throw new AppHttpError({
        code: 'validation/invalid-request',
        message: 'Source external references require a product app credential.',
        httpStatus: 422,
      })
    }
    return null
  }
  if (!principal.appId) {
    throw new AppHttpError({
      code: 'auth/app-identity-required',
      message: 'The product app identity could not be resolved.',
      httpStatus: 401,
    })
  }
  if (body.externalReference !== undefined) {
    throw new AppHttpError({
      code: 'validation/invalid-request',
      message: 'Use sourceExternalReference for product app references.',
      httpStatus: 422,
    })
  }

  const key = req.header('idempotency-key')?.trim() ?? ''
  if (key.length < 1 || key.length > 255) {
    throw new AppHttpError({
      code: 'billing/idempotency-key-required',
      message:
        'Provide an Idempotency-Key header between 1 and 255 characters.',
      httpStatus: 400,
    })
  }

  return {
    sourceAppId: principal.appId,
    sourceExternalReference,
    sourceIdempotencyKey: key,
    sourcePayloadHash: integrationPayloadHash(rawJsonBody(req)),
  }
}
