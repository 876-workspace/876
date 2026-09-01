import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { platform } from '@/lib/services/platform'

export const runtime = 'nodejs'
type Context = { params: Promise<{ appId: string; profileKey: string }> }

export async function PUT(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { appId, profileKey } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid provisioning draft.' }, { status: 400 })

  const result = await platform.provisioning.applicationProfiles.replaceDraft(
    appId,
    profileKey,
    body
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to save provisioning draft.' },
      { status: 400 }
    )

  return apiJson({ data: result.data })
}
