import { platform } from '@/lib/services/platform'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

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

  const { data, error } = await platform.users.checkUsernameAvailability(
    username,
    {
      excludeUserId,
    }
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to check username.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}
