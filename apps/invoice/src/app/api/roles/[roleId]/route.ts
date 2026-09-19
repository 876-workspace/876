import type { NextRequest } from 'next/server'
import { z } from 'zod'

import {
  financePermissionSurface,
  mergeFinancePermissions,
  partitionFinancePermissions,
  withImpliedFinancePermissions,
} from '@876/core/access/finance-catalog'

import { getInvoiceContextResult } from '@/lib/auth/context'
import { requireFinanceRoleManager } from '@/lib/auth/finance-access'
import { getBilling } from '@/lib/clients/billing'

const bodySchema = z.strictObject({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000),
  permissions: z.array(z.string().min(1)).max(200),
})
type RouteContext = { params: Promise<{ roleId: string }> }
const surface = financePermissionSurface('invoice')

function invalidBody() {
  return Response.json(
    { data: null, error: { code: 'invoice/invalid-request', message: 'Invalid request body.' } },
    { status: 400 }
  )
}

async function authorized() {
  const context = await getInvoiceContextResult()
  if (context.status === 'signed-out')
    return { context: null, response: Response.json({ data: null, error: { code: 'invoice/unauthorized', message: 'Authentication is required.' } }, { status: 401 }) }
  if (context.status === 'unavailable')
    return { context: null, response: Response.json({ data: null, error: { code: 'invoice/access-unavailable', message: 'Access could not be verified. Try again.' } }, { status: 503 }) }
  if (context.status !== 'ok')
    return { context: null, response: Response.json({ data: null, error: { code: 'invoice/forbidden', message: 'You do not have permission to manage finance roles.' } }, { status: 403 }) }
  const manager = await requireFinanceRoleManager(context.context.orgId)
  return { context: context.context, response: manager.response }
}

export async function PATCH(request: NextRequest, route: RouteContext) {
  const authorization = await authorized()
  if (authorization.response) return authorization.response
  if (!authorization.context)
    return Response.json({ data: null, error: { code: 'invoice/forbidden', message: 'You do not have permission to manage finance roles.' } }, { status: 403 })
  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return invalidBody()
  const { roleId } = await route.params
  const billing = await getBilling(authorization.context.orgId)
  const existing = await billing.roles.retrieve(roleId)
  if (existing.error || !existing.data)
    return Response.json(existing, { status: existing.error ? 400 : 404 })
  const { external } = partitionFinancePermissions(existing.data.permissions, surface)
  const result = await billing.roles.update(roleId, {
    ...parsed.data,
    permissions: mergeFinancePermissions(
      withImpliedFinancePermissions(parsed.data.permissions),
      external
    ),
  })
  return Response.json(result, { status: result.error ? 400 : 200 })
}

export async function DELETE(_request: NextRequest, route: RouteContext) {
  const authorization = await authorized()
  if (authorization.response) return authorization.response
  if (!authorization.context)
    return Response.json({ data: null, error: { code: 'invoice/forbidden', message: 'You do not have permission to manage finance roles.' } }, { status: 403 })
  const { roleId } = await route.params
  const billing = await getBilling(authorization.context.orgId)
  const result = await billing.roles.delete(roleId)
  return Response.json(result, { status: result.error ? 400 : 200 })
}
