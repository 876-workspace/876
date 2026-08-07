import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from '@/app'

describe('GET /health', () => {
  it('returns the liveness resource', async () => {
    const response = await request(createApp()).get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      object: 'health',
      status: 'ok',
      service: '@876/api',
    })
  })

  it('is not wrapped in the {data,error} envelope', async () => {
    const response = await request(createApp()).get('/health')

    // /health is consumed by Cloudflare and monitoring, not the SDK. Wrapping
    // it would break every probe that reads `status` at the top level.
    expect(response.body).not.toHaveProperty('data')
    expect(response.body).not.toHaveProperty('error')
  })

  it('requires no credentials', async () => {
    const response = await request(createApp()).get('/health')

    expect(response.status).toBe(200)
  })

  it('echoes an inbound x-request-id so a trace survives the hop', async () => {
    const response = await request(createApp())
      .get('/health')
      .set('x-request-id', 'req_abc123')

    expect(response.headers['x-request-id']).toBe('req_abc123')
  })

  it('generates a request id when the caller sends none', async () => {
    const response = await request(createApp()).get('/health')

    expect(response.headers['x-request-id']).toMatch(/^req_[0-9a-f]{32}$/)
  })
})

describe('unmatched routes', () => {
  it('returns an enveloped 404 naming the method and path', async () => {
    const response = await request(createApp()).get('/does-not-exist')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'error/not-found', message: 'Cannot GET /does-not-exist' },
    })
  })

  it('does not leak the server-only http status into the error body', async () => {
    const response = await request(createApp()).get('/does-not-exist')

    expect(response.body.error).not.toHaveProperty('httpStatus')
    expect(response.body.error).not.toHaveProperty('status')
  })
})
