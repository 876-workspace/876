import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getInvoiceContextResult } from '@/lib/auth/context'
import { requireFinanceMemberManager } from '@/lib/auth/finance-access'
import { getWorkspace } from '@/lib/clients/workspace'

const bodySchema = z.strictObject({
  email: z.string().trim().email().max(320),
  role: z.string().trim().min(1).max(80),
})

export async function POST(request: NextRequest) {
  const context = await getInvoiceContextResult()
  if (context.status === 'signed-out') return Response.json({ data: null, error: { code: 'invoice/unauthorized', message: 'Authentication is required.' } }, { status: 401 })
  if (context.status === 'unavailable') return Response.json({ data: null, error: { code: 'invoice/access-unavailable', message: 'Access could not be verified. Try again.' } }, { status: 503 })
  if (context.status !== 'ok') return Response.json({ data: null, error: { code: 'invoice/forbidden', message: 'You do not have permission to invite finance members.' } }, { status: 403 })
  const manager = await requireFinanceMemberManager(context.context.orgId)
  if (manager.response) return manager.response
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ data: null, error: { code: 'invoice/invalid-request', message: 'Invalid request body.' } }, { status: 400 })
  const workspace = await getWorkspace()
  const result = await workspace.invites.create(context.context.orgId, parsed.data)
  return Response.json(result, { status: result.error ? 400 : 201 })
}
