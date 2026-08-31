import { workspace } from '@/lib/services/workspace'
import { apiJson } from '@876/core/api'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

export async function GET() {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response
  const result = await workspace.onboarding.retrieveCatalog(
    'organization',
    'global',
    'JM'
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ?? 'Failed to retrieve onboarding catalog.',
      },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}
