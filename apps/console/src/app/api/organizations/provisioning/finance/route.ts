import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

export async function PUT(request: NextRequest) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson(
      { error: 'Invalid finance provisioning draft.' },
      { status: 400 }
    )
  const result = await $876.provisioning.replaceDraft('finance', 'shared', body)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to save finance defaults.' },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}
