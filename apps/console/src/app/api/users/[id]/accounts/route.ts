import { platform } from '@/lib/clients/platform'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

export async function GET(
  _request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:users')
  if (response) return response

  const { id } = await context.params
  const { data, error } = await platform.users.listAccounts(id)
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to load accounts.' },
      { status: 400 }
    )

  return apiJson({ data: data.data })
}
