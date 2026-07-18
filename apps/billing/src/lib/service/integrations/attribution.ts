import type { ServiceErr, ServiceOk } from '@/types/api'

import { err, ok } from '../result'

/** Durable origin metadata attached to a resource created by a product app. */
export interface IntegrationAttribution {
  sourceAppId: string
  sourceExternalReference: string | null
  sourceIdempotencyKey: string
  sourcePayloadHash: string
}

export interface AttributedCreateResult {
  id: string
  replayed?: true
}

type ExistingAttributedResource = {
  id: string
  sourcePayloadHash: string | null
}

/** Maps product-app attribution into the nullable persistence fields. */
export function attributionData(attribution?: IntegrationAttribution) {
  return attribution
    ? {
        sourceAppId: attribution.sourceAppId,
        sourceExternalReference: attribution.sourceExternalReference,
        sourceIdempotencyKey: attribution.sourceIdempotencyKey,
        sourcePayloadHash: attribution.sourcePayloadHash,
      }
    : {}
}

/** Resolves a stored idempotency record into a replay or payload conflict. */
export function resolveIdempotencyReplay(
  existing: ExistingAttributedResource | null,
  attribution: IntegrationAttribution
): ServiceOk<AttributedCreateResult> | ServiceErr | null {
  if (!existing) return null
  if (existing.sourcePayloadHash !== attribution.sourcePayloadHash)
    return err(
      'This idempotency key was already used with different details.',
      409
    )

  return ok({ id: existing.id, replayed: true as const })
}
