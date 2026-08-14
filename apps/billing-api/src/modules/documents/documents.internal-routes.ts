import type { Request, Response } from 'express'
import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { successEnvelopeSchema } from '@/http/envelope'
import { validParams } from '@/http/middleware/validate'

import { documentsService } from './documents.service'

const params = z.strictObject({
  tenantId: z.string().min(1),
  creditNoteId: z.string().min(1),
})
async function retrieve(req: Request, res: Response) {
  const value = validParams<z.infer<typeof params>>(req)
  res.json(
    await documentsService.getCreditNote(value.tenantId, value.creditNoteId)
  )
}

export function createInternalDocumentsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Billing projections',
    registry: 'internal',
    resolveGuards,
  })
  api.get({
    path: '/projections/tenants/:tenantId/credit-notes/:creditNoteId',
    summary: 'Retrieve a credit note projection',
    security: { kind: 'admin' },
    request: { params },
    responses: {
      200: {
        description: 'Credit note projection',
        schema: successEnvelopeSchema(
          z
            .object({ object: z.literal('credit_note'), id: z.string() })
            .passthrough()
        ),
      },
    },
    handler: retrieve,
  })
  return api.router
}
