import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { platform } from '@/lib/clients/platform'

export const runtime = 'nodejs'
type Context = { params: Promise<{ appId: string; profileKey: string }> }

export async function GET(_request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { appId, profileKey } = await context.params
  const result = await platform.provisioning.applicationProfiles.retrieveManifest(
    appId,
    profileKey
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Provisioning manifest not found.' },
      { status: result.error?.code === 'provisioning/manifest-not-found' ? 404 : 400 }
    )

  return apiJson({ data: result.data })
}
