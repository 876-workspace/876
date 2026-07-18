import { describe, expect, it } from 'vitest'

import { attributionData, resolveIdempotencyReplay } from './attribution'

const attribution = {
  sourceAppId: 'rap_couriers',
  sourceExternalReference: 'delivery_1',
  sourceIdempotencyKey: 'customer-create-1',
  sourcePayloadHash: 'hash_1',
}

describe('integration attribution service helpers', () => {
  it('persists all origin fields only for attributed creates', () => {
    expect(attributionData()).toEqual({})
    expect(attributionData(attribution)).toEqual(attribution)
  })

  it('replays an identical create and conflicts on changed details', () => {
    expect(
      resolveIdempotencyReplay(
        { id: 'cus_1', sourcePayloadHash: 'hash_1' },
        attribution
      )
    ).toEqual({ data: { id: 'cus_1', replayed: true }, error: null })

    expect(
      resolveIdempotencyReplay(
        { id: 'cus_1', sourcePayloadHash: 'other_hash' },
        attribution
      )
    ).toMatchObject({ data: null, error: expect.any(String), status: 409 })
  })
})
