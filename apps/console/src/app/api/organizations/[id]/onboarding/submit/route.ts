import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { $876 } from '@/lib/876'

export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response
  const { id } = await context.params
  const result = await $876.onboarding.submit(
    id,
    'organization',
    'global',
    'JM'
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to submit onboarding.' },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}
