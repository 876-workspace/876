import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { platform } from '@/lib/clients/platform'

export const runtime = 'nodejs'
type Context = { params: Promise<{ appId: string; profileKey: string }> }

export async function POST(_request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { appId, profileKey } = await context.params
  const result = await platform.provisioning.applicationProfiles.publish(
    appId,
    profileKey
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to publish provisioning profile.' },
      { status: 400 }
    )

  return apiJson({ data: result.data })
}
