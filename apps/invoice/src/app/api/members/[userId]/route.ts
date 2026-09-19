import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getInvoiceContextResult } from '@/lib/auth/context'
import { requireFinanceMemberManager } from '@/lib/auth/finance-access'
import { getBilling } from '@/lib/clients/billing'

const bodySchema = z.strictObject({
  roleId: z.string().min(1).max(191),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
})
type RouteContext = { params: Promise<{ userId: string }> }

export async function PATCH(request: NextRequest, route: RouteContext) {
  const context = await getInvoiceContextResult()
  if (context.status === 'signed-out')
    return Response.json({ data: null, error: { code: 'invoice/unauthorized', message: 'Authentication is required.' } }, { status: 401 })
  if (context.status === 'unavailable')
    return Response.json({ data: null, error: { code: 'invoice/access-unavailable', message: 'Access could not be verified. Try again.' } }, { status: 503 })
  if (context.status !== 'ok')
    return Response.json({ data: null, error: { code: 'invoice/forbidden', message: 'You do not have permission to manage finance members.' } }, { status: 403 })
  const manager = await requireFinanceMemberManager(context.context.orgId)
  if (manager.response) return manager.response
  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    return Response.json({ data: null, error: { code: 'invoice/invalid-request', message: 'Invalid request body.' } }, { status: 400 })
  const { userId } = await route.params
  const billing = await getBilling(context.context.orgId)
  const result = await billing.members.update(userId, parsed.data)
  return Response.json(result, { status: result.error ? 400 : 200 })
}
