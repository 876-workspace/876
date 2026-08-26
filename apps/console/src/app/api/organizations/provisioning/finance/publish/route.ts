import { apiJson } from '@876/core/api'

import { workspace } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

export async function POST() {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response
  const result = await workspace.provisioning.draft.publish('finance', 'shared')
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to publish finance defaults.' },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}
