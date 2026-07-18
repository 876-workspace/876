import { apiJson } from '@876/core/api'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'
type Context = { params: Promise<{ runId: string }> }

export async function POST(_request: Request, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response
  const { runId } = await context.params
  const result = await $876.provisioning.runs.retry(runId)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to retry provisioning run.' },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}
