import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  CLIENT_INVALID_RESPONSE_ERROR,
  NETWORK_OFFLINE_ERROR,
  readApiResult,
  requestApiResult,
} from './index'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('application API results', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns canonical success data', async () => {
    const result = await readApiResult<{ id: string }>(
      jsonResponse({ data: { id: 'item_123' }, error: null })
    )

    expect(result).toEqual({ data: { id: 'item_123' }, error: null })
  })

  it('returns canonical API errors without HTTP metadata', async () => {
    const result = await readApiResult(
      jsonResponse(
        {
          data: null,
          error: { code: 'item/not-found', message: 'Item not found.' },
        },
        404
      )
    )

    expect(result).toEqual({
      data: null,
      error: { code: 'item/not-found', message: 'Item not found.' },
    })
  })

  it.each([
    { data: { id: 'item_123' } },
    { data: { id: 'item_123' }, error: null, status: 200 },
    { data: null, error: 'Item not found.' },
    {
      data: null,
      error: {
        code: 'item/not-found',
        message: 'Item not found.',
        httpStatus: 404,
      },
    },
  ])('rejects a non-canonical payload %#', async (payload) => {
    expect(await readApiResult(jsonResponse(payload))).toEqual({
      data: null,
      error: CLIENT_INVALID_RESPONSE_ERROR,
    })
  })

  it('returns the shared offline value when fetch rejects', async () => {
    const fetchImplementation = vi
      .fn()
      .mockRejectedValue(new TypeError('offline'))

    const result = await requestApiResult(
      '/api/items',
      undefined,
      fetchImplementation
    )

    expect(result).toEqual({ data: null, error: NETWORK_OFFLINE_ERROR })
  })

  it('preserves request options and supplies the default JSON header', async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ data: { saved: true }, error: null }, 201)
      )

    await requestApiResult(
      '/api/items',
      { method: 'POST', body: '{"name":"Example"}' },
      fetchImplementation
    )

    expect(fetchImplementation).toHaveBeenCalledWith('/api/items', {
      method: 'POST',
      body: '{"name":"Example"}',
      headers: new Headers({ 'content-type': 'application/json' }),
    })
  })
})
