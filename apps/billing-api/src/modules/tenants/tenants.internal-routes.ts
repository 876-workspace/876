import type { Request, Response } from 'express'
import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { successEnvelopeSchema } from '@/http/envelope'
import { validBody } from '@/http/middleware/validate'

import {
  tenantLifecycleBodySchema,
  tenantLifecycleSchema,
  type TenantLifecycleBody,
} from './tenants.schemas'
import {
  applyTenantLifecycle,
  listTenantsByOrganizationIds,
} from './tenants.service'

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

async function lifecycle(req: Request, res: Response) {
  const body = validBody<TenantLifecycleBody>(req)
  res.json(await applyTenantLifecycle(body.organizationId, body))
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
  api.post({
    path: '/tenants/lifecycle',
    summary: 'Archive or restore a Billing workspace with its organization',
    description:
      'Called by the identity API when an organization is deleted, purged, or restored. The workspace and its financial history are retained; archiving suspends it and records a tombstone.',
    security: { kind: 'admin' },
    request: { body: tenantLifecycleBodySchema },
    responses: {
      200: {
        description: 'The workspace lifecycle outcome',
        schema: tenantLifecycleSchema,
      },
    },
    handler: lifecycle,
  })
  return api.router
}
