import request from 'supertest'

import { createApp } from '@/application'

const mocks = vi.hoisted(() => ({ databaseIsReady: vi.fn() }))

vi.mock('@/modules/health/health.repository', () => ({
  databaseIsReady: mocks.databaseIsReady,
}))

describe('Billing service health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.databaseIsReady.mockResolvedValue(false)
  })

  it('returns the raw liveness resource with a request id and writer header', async () => {
    // ARRANGE
    const app = createApp()

    // ACT
    const response = await request(app).get('/health')

    // ASSERT
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      object: 'health',
      status: 'ok',
      service: '@876/billing-api',
    })
    expect(response.headers['x-request-id']).toMatch(/^req_/)
    expect(response.headers['x-billing-writer']).toBe('none')
  })

  it('reports unavailable readiness when the database cannot be reached', async () => {
    // ARRANGE
    const app = createApp()

    // ACT
    const response = await request(app).get('/ready')

    // ASSERT
    expect(response.status).toBe(503)
    expect(response.body).toEqual({
      object: 'readiness',
      status: 'not_ready',
      service: '@876/billing-api',
      migration: 'unavailable',
      writer: 'none',
    })
    expect(mocks.databaseIsReady).toHaveBeenCalledTimes(1)
  })

  it('preserves an inbound request id', async () => {
    // ARRANGE
    const app = createApp()

    // ACT
    const response = await request(app)
      .get('/health')
      .set('x-request-id', 'req_test')

    // ASSERT
    expect(response.headers['x-request-id']).toBe('req_test')
  })

  it('rejects versioned mutations while Express does not own the writer lease', async () => {
    // ARRANGE
    const app = createApp()

    // ACT
    const response = await request(app)
      .post('/api/v1/vendors')
      .send({ name: 'Harbour Supplies' })

    // ASSERT
    expect(response.status).toBe(503)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'billing/writer-inactive',
        message:
          'The Billing API is not the active writer (BILLING_WRITER=none, expected express).',
      },
    })
    expect(response.headers['x-billing-writer']).toBe('none')
  })
})
