import express from 'express'
import request from 'supertest'
import { z } from 'zod'

import { createApiRouter } from '@/http/api-router'
import { errorHandler } from '@/http/middleware/error-handler'
import {
  registeredOperations,
  resetRegistryForTest,
} from '@/http/openapi/registry'

describe('createApiRouter', () => {
  beforeEach(() => resetRegistryForTest())

  it('can preserve an undocumented legacy body while retaining Zod validation', async () => {
    const api = createApiRouter({ tag: 'Compatibility' })
    api.post({
      path: '/credit-notes',
      summary: 'Compatibility body',
      security: { kind: 'tenant', permission: 'credit_notes:write' },
      request: { body: z.strictObject({ accepted: z.literal(true) }) },
      documentBody: false,
      responses: { 200: { description: 'Accepted' } },
      handler: (_req, res) => res.status(204).end(),
    })
    const operation = registeredOperations('public')[0]?.operation
    expect(operation?.requestBody).toBeUndefined()

    const app = express()
    app.use(express.json())
    app.use(api.router)
    app.use(errorHandler)
    expect(
      (await request(app).post('/credit-notes').send({ accepted: false }))
        .status
    ).toBe(422)
    expect(
      (await request(app).post('/credit-notes').send({ accepted: true })).status
    ).toBe(204)
  })
})
