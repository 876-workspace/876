import { z } from 'zod'
import { apiJson } from '@876/core/api'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { requireAppAccessManager, getBillingWorkspace } from '@/lib/auth/app-access'

const createSchema = z.object({
  user_id: z.string().min(1).optional(),
  membership_id: z.string().min(1).optional(),
  app_id: z.string().min(1).optional(),
  app_slug: z.string().min(1).optional(),
  app_role_id: z.string().min(1).optional(),
  permission_grants: z.array(z.string()).optional(),
  permission_denies: z.array(z.string()).optional(),
  title: z.string().min(1).max(160).nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).nullable().optional(),
  status: z.string().min(1).max(32).optional(),
})

function result(code: string, message: string, status: number) {
  return apiJson({ data: null, error: { code, message } }, { status })
}

export async function POST(request: Request) {
  const context = await getWorkspaceContext()
  if (!context) return result('billing/unauthorized', 'Unauthorized.', 401)
  const manager = await requireAppAccessManager()
  if (manager.response) return manager.response
  const body = await request.json().catch(() => null)
  const input = createSchema.safeParse(body)
  if (!input.success)
    return result('billing/invalid-request', 'Invalid request body.', 400)
  const workspace = await getBillingWorkspace()
  if (!workspace) return result('billing/unauthorized', 'Unauthorized.', 401)
  const response = await workspace.appMemberships.create(context.orgId, input.data)
  return apiJson(response, { status: response.error ? 502 : 201 })
}
