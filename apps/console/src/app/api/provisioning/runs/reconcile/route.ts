import { apiJson } from '@876/core/api'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response
  const input: unknown = await request.json().catch(() => null)
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return apiJson(
      { error: 'Invalid reconciliation request.' },
      { status: 400 }
    )
  const body = input as Record<string, unknown>
  if (!validFilter(body, 'app_id') || !validFilter(body, 'organization_id'))
    return apiJson(
      { error: 'Invalid reconciliation request.' },
      { status: 400 }
    )
  const appId = typeof body.app_id === 'string' ? body.app_id.trim() : ''
  const organizationId =
    typeof body.organization_id === 'string' ? body.organization_id.trim() : ''
  const result = await $876.provisioning.runs.reconcile({
    app_id: appId || null,
    organization_id: organizationId || null,
  })
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to reconcile provisioning.' },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}

function validFilter(
  input: Record<string, unknown>,
  key: 'app_id' | 'organization_id'
): boolean {
  const value = key in input ? input[key] : undefined
  return value === undefined || value === null || typeof value === 'string'
}
