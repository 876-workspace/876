import type { Request, Response } from 'express'
import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { successEnvelopeSchema } from '@/http/envelope'
import { validBody } from '@/http/middleware/validate'

import { listTenantsByOrganizationIds } from './tenants.service'

const requestSchema = z.strictObject({
  organizationIds: z.array(z.string().min(1)).max(100),
})
const tenantSchema = z
  .object({
    id: z.string(),
    organizationId: z.string().nullable(),
    slug: z.string(),
    name: z.string(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED']),
    defaultCurrency: z.string(),
    defaultLanguage: z.string(),
    createdAt: z.number().int(),
    updatedAt: z.number().int(),
  })
  .passthrough()

async function list(req: Request, res: Response) {
  const body = validBody<z.infer<typeof requestSchema>>(req)
  res.json(await listTenantsByOrganizationIds(body.organizationIds))
}

export function createInternalTenantsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Billing projections',
    registry: 'internal',
    resolveGuards,
  })
  api.post({
    path: '/projections/tenants',
    summary: 'Resolve Billing workspaces by platform organization',
    security: { kind: 'admin' },
    request: { body: requestSchema },
    responses: {
      200: {
        description: 'Billing workspaces',
        schema: successEnvelopeSchema(z.array(tenantSchema)),
      },
    },
    handler: list,
  })
  return api.router
}
