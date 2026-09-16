import request from 'supertest'

import { resetSettingsForTest } from '../config/index.js'
import { createApp } from '../application.js'

vi.mock('../db/index.js', () => ({
  prisma: { $queryRaw: vi.fn() },
  disconnectDb: vi.fn(),
}))

describe('internal-key guard placement', () => {
  beforeEach(() => {
    process.env.COMMUNICATIONS_DATABASE_URL =
      'postgresql://localhost:5432/communications_test'
    process.env.COMMUNICATIONS_INTERNAL_KEY = 'test-internal-key'
    resetSettingsForTest()
  })

  it('returns 404 for an unknown path under /v1 without credentials', async () => {
    const app = createApp()

    const response = await request(app).get('/v1/does-not-exist')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('communications/not-found')
  })

  it('returns 401 for a known route without credentials', async () => {
    const app = createApp()

    const response = await request(app).get(
      '/v1/organizations/org_1/email/domains'
    )

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('communications/unauthorized')
  })
})
