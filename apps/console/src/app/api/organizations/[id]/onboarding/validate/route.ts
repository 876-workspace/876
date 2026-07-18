import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { $876 } from '@/lib/876'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid onboarding answers.' }, { status: 400 })
  const result = await $876.onboarding.validate('organization', 'global', body)
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ?? 'Failed to validate onboarding answers.',
      },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}
