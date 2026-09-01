import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { platform } from '@/lib/services/platform'

export const runtime = 'nodejs'
type Context = { params: Promise<{ appId: string }> }

export async function GET(_request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { appId } = await context.params
  const result = await platform.provisioning.applicationProfiles.list(appId)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to load provisioning profiles.' },
      { status: 400 }
    )

  return apiJson({ data: result.data.data })
}

export async function POST(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { appId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid provisioning profile.' }, { status: 400 })

  const result = await platform.provisioning.applicationProfiles.create(
    appId,
    body
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to create provisioning profile.' },
      { status: 400 }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
