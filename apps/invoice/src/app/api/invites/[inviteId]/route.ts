import { getInvoiceContextResult } from '@/lib/auth/context'
import { requireFinanceMemberManager } from '@/lib/auth/finance-access'
import { getWorkspace } from '@/lib/services/workspace'

type RouteContext = { params: Promise<{ inviteId: string }> }

export async function DELETE(_request: Request, route: RouteContext) {
  const context = await getInvoiceContextResult()
  if (context.status === 'signed-out') return Response.json({ data: null, error: { code: 'invoice/unauthorized', message: 'Authentication is required.' } }, { status: 401 })
  if (context.status === 'unavailable') return Response.json({ data: null, error: { code: 'invoice/access-unavailable', message: 'Access could not be verified. Try again.' } }, { status: 503 })
  if (context.status !== 'ok') return Response.json({ data: null, error: { code: 'invoice/forbidden', message: 'You do not have permission to invite finance members.' } }, { status: 403 })
  const manager = await requireFinanceMemberManager(context.context.orgId)
  if (manager.response) return manager.response
  const { inviteId } = await route.params
  const workspace = await getWorkspace()
  const result = await workspace.invites.revoke(context.context.orgId, inviteId)
  return Response.json(result, { status: result.error ? 400 : 200 })
}
