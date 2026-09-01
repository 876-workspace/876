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
  const result = await platform.provisioning.applicationProfiles.retrieve(
    appId,
    profileKey
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Provisioning profile not found.' },
      { status: result.error?.code === 'provisioning/application-profile-not-found' ? 404 : 400 }
    )

  return apiJson({ data: result.data })
}

export async function PATCH(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { appId, profileKey } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid provisioning profile update.' }, { status: 400 })

  const result = await platform.provisioning.applicationProfiles.update(
    appId,
    profileKey,
    body
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to update provisioning profile.' },
      { status: 400 }
    )

  return apiJson({ data: result.data })
}
