import { apiJson } from '@876/core/api'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'
type Context = { params: Promise<{ appId: string }> }

export async function POST(_request: Request, context: Context) {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response
  const { appId } = await context.params
  const result = await $876.provisioning.publish('application', appId)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to publish provisioning.' },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}
