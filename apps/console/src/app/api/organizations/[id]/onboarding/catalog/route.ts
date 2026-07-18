import { apiJson } from '@876/core/api'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { $876 } from '@/lib/876'

export const runtime = 'nodejs'

export async function GET() {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response
  const result = await $876.onboarding.retrieveCatalog(
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
