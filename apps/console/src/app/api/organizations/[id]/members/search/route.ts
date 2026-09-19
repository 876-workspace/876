import { platform } from '@/lib/clients/platform'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

/** Searches existing 876 users who can be added to an organization. */
export async function GET(
  request: NextRequest,
  _context: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (query.length < 2) return apiJson({ data: [] })

  const { data, error } = await platform.users.search({ query, limit: 10 })
  if (error) {
    return apiJson(
      { error: error.message ?? 'Search failed.' },
      { status: 400 }
    )
  }

  return apiJson({ data: data?.data ?? [] })
}
