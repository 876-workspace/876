import { describe, expect, it } from 'vitest'

import { apiError, apiJson, apiSuccess } from './api'

describe('API response envelopes', () => {
  it('returns both canonical keys for success responses', async () => {
    const response = apiSuccess({ object: 'example', id: 'example_123' })

    expect(await response.json()).toEqual({
      data: { object: 'example', id: 'example_123' },
      error: null,
    })
  })

  it('returns client-safe errors without HTTP metadata in the body', async () => {
    const response = apiError('The example was not found.', { status: 404 })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'error/not-found',
        message: 'The example was not found.',
      },
    })
  })

  it('normalizes legacy success and error payloads', async () => {
    const success = apiJson({ data: { saved: true } })
    const failure = apiJson(
      { error: 'Unable to save the example.' },
      {
        status: 409,
      }
    )

    expect(await success.json()).toEqual({
      data: { saved: true },
      error: null,
    })
    expect(await failure.json()).toEqual({
      data: null,
      error: {
        code: 'error/conflict',
        message: 'Unable to save the example.',
      },
    })
  })
})
