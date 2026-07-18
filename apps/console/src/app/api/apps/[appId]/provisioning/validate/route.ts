import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'
type Context = { params: Promise<{ appId: string }> }

export async function POST(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response
  const { appId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid provisioning draft.' }, { status: 400 })
  const result = await $876.provisioning.validate('application', appId, body)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to validate provisioning.' },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}
