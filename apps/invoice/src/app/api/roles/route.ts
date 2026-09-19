import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { withImpliedFinancePermissions } from '@876/core/access/finance-catalog'

import { getInvoiceContextResult } from '@/lib/auth/context'
import { requireFinanceRoleManager } from '@/lib/auth/finance-access'
import { getBilling } from '@/lib/clients/billing'

const bodySchema = z.strictObject({
  name: z.string().trim().min(1).max(160),
  slug: z.string().trim().regex(/^[a-z0-9_]{2,50}$/),
  description: z.string().trim().max(2_000),
  permissions: z.array(z.string().min(1)).max(200),
})

function invalidBody() {
  return Response.json(
    { data: null, error: { code: 'invoice/invalid-request', message: 'Invalid request body.' } },
    { status: 400 }
  )
}

export async function POST(request: NextRequest) {
  const context = await getInvoiceContextResult()
  if (context.status === 'signed-out')
    return Response.json({ data: null, error: { code: 'invoice/unauthorized', message: 'Authentication is required.' } }, { status: 401 })
  if (context.status === 'unavailable')
    return Response.json({ data: null, error: { code: 'invoice/access-unavailable', message: 'Access could not be verified. Try again.' } }, { status: 503 })
  if (context.status !== 'ok')
    return Response.json({ data: null, error: { code: 'invoice/forbidden', message: 'You do not have permission to manage finance roles.' } }, { status: 403 })

  const manager = await requireFinanceRoleManager(context.context.orgId)
  if (manager.response) return manager.response

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return invalidBody()

  const billing = await getBilling(context.context.orgId)
  const result = await billing.roles.create({
    ...parsed.data,
    permissions: withImpliedFinancePermissions(parsed.data.permissions),
  })
  return Response.json(result, { status: result.error ? 400 : 201 })
}
