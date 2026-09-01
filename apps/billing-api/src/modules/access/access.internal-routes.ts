import type { Request, Response } from 'express'
import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { successEnvelopeSchema } from '@/http/envelope'
import { validBody, validParams } from '@/http/middleware/validate'

import { listMembers, resolveMemberAccess } from './access.service'

const tenantParams = z.strictObject({ tenantId: z.string().min(1) })
export const accessResolveBodySchema = tenantParams.extend({
  userId: z.string().min(1),
  // The canonical value is `super-admin`; the legacy `super_admin` stays
  // accepted for the naming cutover, matching the dual-read in the service.
  // Rejecting the canonical value here would fail member-access resolution for
  // every super admin, since callers already normalize to it.
  organizationRole: z.enum(['super-admin', 'super_admin', 'admin', 'staff']),
})
const role = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    permissions: z.array(z.string()),
  })
  .passthrough()
const memberAccess = z.object({
  userId: z.string(),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  role,
  permissions: z.array(z.string()),
})

async function resolve(req: Request, res: Response) {
  const body = validBody<z.infer<typeof accessResolveBodySchema>>(req)
  res.json(
    await resolveMemberAccess(body.tenantId, body.userId, body.organizationRole)
  )
}

async function list(req: Request, res: Response) {
  const { tenantId } = validParams<z.infer<typeof tenantParams>>(req)
  res.json(await listMembers(tenantId))
}

export function createInternalAccessRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Billing projections',
    registry: 'internal',
    resolveGuards,
  })
  api.post({
    path: '/projections/member-access',
    summary: 'Resolve effective Billing member access',
    security: { kind: 'admin' },
    request: { body: accessResolveBodySchema },
    responses: {
      200: {
        description: 'Effective Billing access',
        schema: successEnvelopeSchema(memberAccess.nullable()),
      },
    },
    handler: resolve,
  })
  api.get({
    path: '/projections/tenants/:tenantId/members',
    summary: 'List explicit Billing member grants',
    security: { kind: 'admin' },
    request: { params: tenantParams },
    responses: {
      200: {
        description: 'Billing member grants',
        schema: successEnvelopeSchema(
          z.array(
            z
              .object({
                object: z.literal('billing_member'),
                id: z.string(),
                userId: z.string(),
                roleId: z.string(),
                status: z.enum(['ACTIVE', 'SUSPENDED']),
                role,
              })
              .passthrough()
          )
        ),
      },
    },
    handler: list,
  })
  return api.router
}
