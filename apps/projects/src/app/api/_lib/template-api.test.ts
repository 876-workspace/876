import { describe, expect, it } from 'vitest'

import { templateErrorStatus, templateFailure } from './template-api'

describe('templateErrorStatus', () => {
  it('answers a missing template with not-found', () => {
    expect(templateErrorStatus('projects/template-not-found')).toBe(404)
    expect(templateErrorStatus('projects/project-not-found')).toBe(404)
  })

  it('answers a taken key with conflict', () => {
    expect(templateErrorStatus('projects/template-key-taken')).toBe(409)
    expect(templateErrorStatus('projects/project-key-taken')).toBe(409)
  })

  it('answers input the service rejects with unprocessable entity', () => {
    expect(templateErrorStatus('projects/invalid-template-key')).toBe(422)
    expect(templateErrorStatus('projects/template-missing-references')).toBe(
      422
    )
    expect(templateErrorStatus('projects/template-dependency-cycle')).toBe(422)
  })

  it('degrades an unknown code to a bad request', () => {
    expect(templateErrorStatus('projects/something-new')).toBe(400)
  })
})

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
