import { workspace } from '@/lib/clients/workspace'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response
  const { id } = await context.params
  const result = await workspace.onboarding.retrieve(
    id,
    'organization',
    'global'
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to retrieve onboarding.' },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}

export async function PUT(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response
  const { id } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid onboarding answers.' }, { status: 400 })
  const result = await workspace.onboarding.replaceAnswers(
    id,
    'organization',
    'global',
    body
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to save onboarding answers.' },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}
