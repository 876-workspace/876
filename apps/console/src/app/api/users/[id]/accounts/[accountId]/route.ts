import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string; accountId: string }> }

export async function DELETE(
  _request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:users')
  if (response) return response

  const { id, accountId } = await context.params
  const { data, error } = await $876.users.unlinkAccount(id, accountId)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to unlink account.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}
