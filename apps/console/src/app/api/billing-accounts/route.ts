import { billing } from '@/lib/services/billing'
import { workspace } from '@/lib/services/workspace'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

export async function POST(request: NextRequest): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const { data, error } = await workspace.billingAccounts.create(body)
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to create billing account.' },
      { status: 400 }
    )

  return apiJson({ data }, { status: 201 })
}
