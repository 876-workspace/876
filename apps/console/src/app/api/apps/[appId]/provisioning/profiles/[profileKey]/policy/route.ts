import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { platform } from '@/lib/services/platform'

export const runtime = 'nodejs'
type Context = { params: Promise<{ appId: string; profileKey: string }> }

export async function GET(_request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { appId, profileKey } = await context.params
  const result = await platform.provisioning.applicationProfiles.retrievePolicy(
    appId,
    profileKey
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to load profile routing policy.' },
      { status: 400 }
    )

  return apiJson({ data: result.data })
}

export async function PUT(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { appId, profileKey } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid routing policy.' }, { status: 400 })

  const result = await platform.provisioning.applicationProfiles.replacePolicy(
    appId,
    profileKey,
    body
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to update routing policy.' },
      { status: 400 }
    )

  return apiJson({ data: result.data })
}
