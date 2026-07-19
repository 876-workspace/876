import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { sendRequest } from './transport'

const itemSchema = z.object({ id: z.string() })

describe('sendRequest', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns parsed data on a successful response', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ data: { id: 'blitem_1' }, error: null })
      )

    const result = await sendRequest(
      { baseUrl: 'https://billing.example.test', fetch: fetchMock },
      { method: 'GET', path: '/api/v1/items' },
      itemSchema
    )

    expect(result).toEqual({ data: { id: 'blitem_1' }, error: null })
  })

  it('returns a billing/unreachable error, not a generic offline error, when the Billing service cannot be reached', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError('fetch failed'))

    const resultPromise = sendRequest(
      { baseUrl: 'http://127.0.0.1:3004', fetch: fetchMock },
      { method: 'GET', path: '/api/v1/items' },
      itemSchema
    )
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result).toEqual({
      data: null,
      error: {
        code: 'billing/unreachable',
        message:
          'Could not reach the Billing service. It may not be running or reachable at its configured URL.',
      },
    })
  })

  it('returns billing/invalid-response when the payload is not a data/error envelope', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ id: 'blitem_1' }))

    const result = await sendRequest(
      { baseUrl: 'https://billing.example.test', fetch: fetchMock },
      { method: 'GET', path: '/api/v1/items' },
      itemSchema
    )

    expect(result).toEqual({
      data: null,
      error: {
        code: 'billing/invalid-response',
        message: 'The Billing service returned an invalid response.',
      },
    })
  })

  it('normalizes a structured error payload from the Billing service', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          data: null,
          error: {
            code: 'billing/item-not-found',
            message: 'No item with that ID exists.',
            param: 'itemId',
          },
        },
        { status: 404 }
      )
    )

    const result = await sendRequest(
      { baseUrl: 'https://billing.example.test', fetch: fetchMock },
      { method: 'GET', path: '/api/v1/items/blitem_missing' },
      itemSchema
    )

    expect(result).toEqual({
      data: null,
      error: {
        code: 'billing/item-not-found',
        message: 'No item with that ID exists.',
        param: 'itemId',
      },
    })
  })

  it('returns billing/unknown-error when the error payload is malformed', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ data: null, error: 'boom' }, { status: 400 })
      )

    const result = await sendRequest(
      { baseUrl: 'https://billing.example.test', fetch: fetchMock },
      { method: 'GET', path: '/api/v1/items' },
      itemSchema
    )

    expect(result).toEqual({
      data: null,
      error: {
        code: 'billing/unknown-error',
        message: 'The Billing request failed.',
      },
    })
  })

  it('returns billing/invalid-response when the success payload fails schema validation', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ data: { wrongField: 1 }, error: null })
      )

    const result = await sendRequest(
      { baseUrl: 'https://billing.example.test', fetch: fetchMock },
      { method: 'GET', path: '/api/v1/items' },
      itemSchema
    )

    expect(result).toEqual({
      data: null,
      error: {
        code: 'billing/invalid-response',
        message: 'The Billing service returned an invalid response.',
      },
    })
  })
})
