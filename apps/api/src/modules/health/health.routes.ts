import { createApiRouter } from '@/http/api-router'

import * as docs from './health.docs'
import { healthSchema, type Health } from './health.schemas'

const api = createApiRouter({ tag: 'System', security: 'public' })

api.get({
  path: '/health',
  operationId: 'system-get_health',
  summary: docs.HEALTH_SUMMARY,
  description: docs.HEALTH_DESCRIPTION,
  responses: {
    200: { ...docs.HEALTH_RESPONSES[200], schema: healthSchema },
  },
  handler: (_req, res) => {
    const body: Health = { object: 'health', status: 'ok', service: '@876/api' }
    // /health is deliberately outside the {data,error} envelope — it is a
    // liveness probe read by Cloudflare and monitoring, not by the SDK.
    res.status(200).json(body)
  },
})

export const healthRouter = api.router
