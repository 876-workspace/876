import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { workspace } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ setupKey: string }> }
) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { setupKey } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson(
      { error: 'Invalid finance provisioning draft.' },
      { status: 400 }
    )

  const result = await workspace.provisioning.draft.update(
    'finance',
    setupKey,
    body
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to save the setup defaults.' },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}
