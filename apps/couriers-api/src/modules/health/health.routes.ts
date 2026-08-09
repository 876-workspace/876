import { createApiRouter } from '@/http/api-router'
import { successEnvelopeSchema } from '@/http/envelope'

import * as docs from './health.docs'
import { healthQuerySchema, healthSchema, type Health } from './health.schemas'

const api = createApiRouter({ tag: 'System', security: 'public' })

api.get({
  path: '/health',
  operationId: 'system-get_health',
  summary: docs.HEALTH_SUMMARY,
  description: docs.HEALTH_DESCRIPTION,
  request: { query: healthQuerySchema },
  responses: {
    200: {
      ...docs.HEALTH_RESPONSES[200],
      schema: successEnvelopeSchema(healthSchema),
    },
  },
  handler: (_req, res) => {
    const body: Health = {
      object: 'health',
      status: 'ok',
      service: '@876/couriers-api',
    }
    res.status(200).json(body)
  },
})

export const healthRouter = api.router
