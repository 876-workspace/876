import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Context = { params: Promise<{ username: string }> }

export async function DELETE(
  _request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:settings')
  if (response) return response

  const { username } = await context.params
  const { data, error } = await $876.reservedUsernames.delete(username)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to remove reserved username.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}
