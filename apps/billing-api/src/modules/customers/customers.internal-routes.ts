import type { Request, Response } from 'express'
import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { successEnvelopeSchema } from '@/http/envelope'
import { validParams } from '@/http/middleware/validate'

import { listDocumentRecipients } from './customers.service'

const params = z.strictObject({ tenantId: z.string().min(1) })
const person = z.object({
  salutation: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  workPhone: z.string().nullable(),
  mobilePhone: z.string().nullable(),
})
const recipient = z
  .object({
    id: z.string(),
    name: z.string(),
    contacts: z.array(person),
    addresses: z.array(z.object({}).passthrough()),
  })
  .passthrough()

async function list(req: Request, res: Response) {
  const { tenantId } = validParams<z.infer<typeof params>>(req)
  res.json(await listDocumentRecipients(tenantId))
}

export function createInternalCustomersRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Billing projections',
    registry: 'internal',
    resolveGuards,
  })
  api.get({
    path: '/projections/tenants/:tenantId/document-recipients',
    summary: 'List customers projected for document composition',
    security: { kind: 'admin' },
    request: { params },
    responses: {
      200: {
        description: 'Document recipients',
        schema: successEnvelopeSchema(z.array(recipient)),
      },
    },
    handler: list,
  })
  return api.router
}
