import 'server-only'

import {
  invalidRequest,
  requireRequestAccess,
  resultResponse,
} from '../../../_lib/access'
import { crm } from '@/lib/services/crm'

export const runtime = 'nodejs'
type Context = { params: Promise<{ requestId: string; eventId: string }> }

export async function DELETE(request: Request, context: Context) {
  const body = (await request.json().catch(() => null)) as {
    orgSlug?: unknown
  } | null
  const orgSlug = typeof body?.orgSlug === 'string' ? body.orgSlug : null
  if (!orgSlug) return invalidRequest()

  const { context: access, response } = await requireRequestAccess(orgSlug)
  if (response) return response
  if (!access) return invalidRequest()

  const { requestId, eventId } = await context.params
  const result = await crm.requestEvents.delete(
    access.orgId,
    requestId,
    eventId,
    { deletedBy: access.userId }
  )

  return resultResponse(result, 200)
}
