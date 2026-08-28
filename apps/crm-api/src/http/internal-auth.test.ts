import express from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { requireInternal, secretsMatch } from './internal-auth.js'

const CONFIGURED_KEY = 'crm-internal-3f9a1c7b5e2d48a6'

function buildApp() {
  const app = express()
  app.get('/protected', requireInternal, (_req, res) => {
    res.status(200).json({ data: { object: 'probe' }, error: null })
  })
  return app
}

const UNAUTHORIZED_BODY = {
  data: null,
  error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
}

describe('secretsMatch', () => {
  it('returns true for two identical secrets', () => {
    expect(secretsMatch(CONFIGURED_KEY, CONFIGURED_KEY)).toBe(true)
  })

  it('returns false for two different secrets of equal length', () => {
    expect(secretsMatch('a'.repeat(24), 'b'.repeat(24))).toBe(false)
  })

  it('returns false without throwing when the secrets differ in length', () => {
    expect(secretsMatch('short', CONFIGURED_KEY)).toBe(false)
  })

  it('returns false when the presented secret is empty', () => {
    expect(secretsMatch('', CONFIGURED_KEY)).toBe(false)
  })

  it('returns false when the configured secret is empty', () => {
    expect(secretsMatch(CONFIGURED_KEY, '')).toBe(false)
  })

  it('returns false when the presented secret is a prefix of the configured one', () => {
    expect(secretsMatch(CONFIGURED_KEY.slice(0, 8), CONFIGURED_KEY)).toBe(false)
  })

  // This is why requireInternal trims the header before comparing: the compare
  // itself is exact, so an untrimmed value would be rejected.
  it('returns false for a padded copy of the configured secret', () => {
    expect(secretsMatch(`  ${CONFIGURED_KEY}  `, CONFIGURED_KEY)).toBe(false)
  })
})

describe('requireInternal', () => {
  beforeEach(() => {
    process.env.CRM_INTERNAL_KEY = CONFIGURED_KEY
  })

  afterEach(() => {
    delete process.env.CRM_INTERNAL_KEY
  })

  it('passes the request through when the key matches exactly', async () => {
    const response = await request(buildApp())
      .get('/protected')
      .set('x-internal-key', CONFIGURED_KEY)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: { object: 'probe' }, error: null })
  })

  it('rejects a request carrying no key header', async () => {
    const response = await request(buildApp()).get('/protected')

    expect(response.status).toBe(401)
    expect(response.body).toEqual(UNAUTHORIZED_BODY)
  })

  it('rejects a request whose key header is empty', async () => {
    const response = await request(buildApp())
      .get('/protected')
      .set('x-internal-key', '')

    expect(response.status).toBe(401)
    expect(response.body).toEqual(UNAUTHORIZED_BODY)
  })

  it('rejects a request whose key header is only whitespace', async () => {
    const response = await request(buildApp())
      .get('/protected')
      .set('x-internal-key', '   ')

    expect(response.status).toBe(401)
    expect(response.body).toEqual(UNAUTHORIZED_BODY)
  })

  it('rejects a request presenting a different key', async () => {
    const response = await request(buildApp())
      .get('/protected')
      .set('x-internal-key', 'not-the-configured-key')

    expect(response.status).toBe(401)
    expect(response.body).toEqual(UNAUTHORIZED_BODY)
  })

  it('rejects every request when CRM_INTERNAL_KEY is unset', async () => {
    delete process.env.CRM_INTERNAL_KEY

    const response = await request(buildApp())
      .get('/protected')
      .set('x-internal-key', CONFIGURED_KEY)

    expect(response.status).toBe(401)
    expect(response.body).toEqual(UNAUTHORIZED_BODY)
  })

  it('rejects every request when CRM_INTERNAL_KEY is an empty string', async () => {
    process.env.CRM_INTERNAL_KEY = ''

    const response = await request(buildApp())
      .get('/protected')
      .set('x-internal-key', '')

    expect(response.status).toBe(401)
    expect(response.body).toEqual(UNAUTHORIZED_BODY)
  })
})
