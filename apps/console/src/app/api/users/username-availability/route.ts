import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

export async function GET(request: NextRequest): Promise<Response> {
  const { response } = await requireConsolePermission('console:users')
  if (response) return response

  const username = request.nextUrl.searchParams.get('username')?.trim() ?? ''
  if (!username) {
    return apiJson({ error: 'username is required.' }, { status: 400 })
  }
  const excludeUserId =
    request.nextUrl.searchParams.get('exclude_user_id') ?? undefined

  const { data, error } = await $876.users.checkUsernameAvailability(username, {
    excludeUserId,
  })
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to check username.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}
