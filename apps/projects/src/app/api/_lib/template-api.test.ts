import { describe, expect, it } from 'vitest'

import { templateFailure } from './template-api'

describe('templateFailure', () => {
  it('answers with the message the service produced', async () => {
    const response = templateFailure(
      { code: 'projects/template-key-taken', message: 'That key is taken.' },
      'Fallback.'
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'error/conflict', message: 'That key is taken.' },
    })
  })

  it('answers a missing error as a bad request with the fallback', async () => {
    const response = templateFailure(null, 'Fallback.')

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'error/bad-request', message: 'Fallback.' },
    })
  })
})
