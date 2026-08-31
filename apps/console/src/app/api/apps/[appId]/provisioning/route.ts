import { workspace } from '@/lib/services/workspace'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'
type Context = { params: Promise<{ appId: string }> }

export async function GET(_request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response
  const { appId } = await context.params
  const result = await workspace.provisioning.draft.retrieve(
    'application',
    appId
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Provisioning profile not found.' },
      {
        status:
          result.error?.code === 'provisioning/manifest-not-found' ? 404 : 400,
      }
    )
  return apiJson({ data: result.data })
}

export async function PUT(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response
  const { appId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid provisioning draft.' }, { status: 400 })
  const result = await workspace.provisioning.draft.update(
    'application',
    appId,
    body
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error: result.error?.message ?? 'Failed to save provisioning draft.',
      },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}
