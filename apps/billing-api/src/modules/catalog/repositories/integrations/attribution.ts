import type { ServiceErr, ServiceOk } from '../../schemas/api'

import { err, ok } from '../result'

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

export function attributionData(attribution?: IntegrationAttribution) {
  return attribution ? { ...attribution } : {}
}

export function resolveIdempotencyReplay(
  existing: ExistingAttributedResource | null,
  attribution: IntegrationAttribution
): ServiceOk<AttributedCreateResult> | ServiceErr | null {
  if (!existing) return null
  if (existing.sourcePayloadHash !== attribution.sourcePayloadHash) {
    return err(
      'This idempotency key was already used with different details.',
      409
    )
  }
  return ok({ id: existing.id, replayed: true as const })
}
