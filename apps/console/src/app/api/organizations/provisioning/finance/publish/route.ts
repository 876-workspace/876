import { apiJson } from '@876/core/api'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

export async function POST() {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response
  const result = await $876.provisioning.publish('finance', 'shared')
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to publish finance defaults.' },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}
