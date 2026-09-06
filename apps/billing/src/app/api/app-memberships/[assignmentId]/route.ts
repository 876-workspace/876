import { z } from 'zod'
import { apiJson } from '@876/core/api'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { requireAppAccessManager, getBillingWorkspace } from '@/lib/auth/app-access'

const updateSchema = z.object({
  app_role_id: z.string().min(1).nullable().optional(),
  permission_grants: z.array(z.string()).optional(),
  permission_denies: z.array(z.string()).optional(),
  title: z.string().min(1).max(160).nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).nullable().optional(),
  status: z.string().min(1).max(32).optional(),
})
type RouteContext = { params: Promise<{ assignmentId: string }> }

function result(code: string, message: string, status: number) {
  return apiJson({ data: null, error: { code, message } }, { status })
}

async function authorize() {
  const context = await getWorkspaceContext()
  if (!context)
    return { context: null, response: result('billing/unauthorized', 'Unauthorized.', 401) }
  const manager = await requireAppAccessManager()
  if (manager.response) return { context: null, response: manager.response }
  return { context, response: null }
}

export async function PATCH(request: Request, route: RouteContext) {
  const authorized = await authorize()
  if (authorized.response) return authorized.response
  const body = await request.json().catch(() => null)
  const input = updateSchema.safeParse(body)
  if (!input.success)
    return result('billing/invalid-request', 'Invalid request body.', 400)
  const workspace = await getBillingWorkspace()
  if (!workspace) return result('billing/unauthorized', 'Unauthorized.', 401)
  const { assignmentId } = await route.params
  const response = await workspace.appMemberships.update(
    authorized.context.orgId,
    assignmentId,
    input.data
  )
  return apiJson(response, { status: response.error ? 502 : 200 })
}

export async function DELETE(_request: Request, route: RouteContext) {
  const authorized = await authorize()
  if (authorized.response) return authorized.response
  const workspace = await getBillingWorkspace()
  if (!workspace) return result('billing/unauthorized', 'Unauthorized.', 401)
  const { assignmentId } = await route.params
  const response = await workspace.appMemberships.delete(
    authorized.context.orgId,
    assignmentId
  )
  return apiJson(response, { status: response.error ? 502 : 200 })
}
