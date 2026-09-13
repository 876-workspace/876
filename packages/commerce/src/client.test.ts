import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { create876CommerceClient } from './client'
import { request } from './request'

describe('Commerce client', () => {
  it('uses the local Commerce service by default', () =>
    expect(
      create876CommerceClient({ internalKey: 'key' }).runtime.baseUrl
    ).toBe('http://localhost:4010'))
  it('uses an explicit base URL', () =>
    expect(
      create876CommerceClient({
        baseUrl: 'https://commerce.example/',
        internalKey: 'key',
      }).runtime.baseUrl
    ).toBe('https://commerce.example'))
  it('returns a configuration error without a key', async () =>
    expect(
      (
        await request(
          create876CommerceClient().runtime,
          { path: '/', method: 'GET' },
          z.null()
        )
      ).error?.code
    ).toBe('commerce/not-configured'))
  it('shapes invalid envelopes as stable errors', async () => {
    const runtime = create876CommerceClient({
      internalKey: 'key',
      fetch: async () => new Response('bad', { status: 200 }),
    }).runtime
    expect(
      (
        await request(runtime, { path: '/', method: 'GET' }, z.null())
      ).error?.code
    ).toBe('commerce/invalid-response')
  })
})
