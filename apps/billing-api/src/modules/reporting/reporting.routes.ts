import type { Request, Response } from 'express'
import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { successEnvelopeSchema } from '@/http/envelope'
import { validParams } from '@/http/middleware/validate'

import { dashboardOverview } from './reporting.service'

const params = z.strictObject({ tenantId: z.string().min(1) })
async function dashboard(req: Request, res: Response) {
  const { tenantId } = validParams<z.infer<typeof params>>(req)
  res.json(await dashboardOverview(tenantId))
}

export function createInternalReportingRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Billing projections',
    registry: 'internal',
    resolveGuards,
  })
  api.get({
    path: '/projections/tenants/:tenantId/dashboard',
    summary: 'Retrieve the Billing dashboard projection',
    security: { kind: 'admin' },
    request: { params },
    responses: {
      200: {
        description: 'Dashboard projection',
        schema: successEnvelopeSchema(z.object({ object: z.literal('billing_dashboard') }).passthrough()),
      },
    },
    handler: dashboard,
  })
  return api.router
}
