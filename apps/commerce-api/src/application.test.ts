import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from './application'
const app = createApp()
describe('Commerce API probes', () => {
  it('returns the health envelope', async () =>
    expect((await request(app).get('/health')).body).toEqual({
      data: { status: 'ok', service: 'commerce-api' },
      error: null,
    }))
  it('returns readiness without claiming a database', async () =>
    expect((await request(app).get('/ready')).body.data).toEqual({
      status: 'ok',
      service: 'commerce-api',
    }))
  it('responds to health successfully', async () =>
    expect((await request(app).get('/health')).status).toBe(200))
  it('returns the canonical unknown-route envelope', async () =>
    expect((await request(app).get('/missing')).body.error.code).toBe(
      'commerce/not-found'
    ))
  it('propagates a supplied request id', async () =>
    expect(
      (await request(app).get('/health').set('x-request-id', 'request_123'))
        .headers['x-request-id']
    ).toBe('request_123'))
})
