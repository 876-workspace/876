import 'server-only'

import { apiJson } from '@876/core/api'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { integration } from '@/lib/clients/integration'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

export async function GET() {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const result = await integration.getMetricsSummary()
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Metrics could not be loaded.' },
      { status: 400 }
    )

  return apiJson({ data: result.data })
}
