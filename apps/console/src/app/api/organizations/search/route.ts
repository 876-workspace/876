import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

/** Searches organizations. Pure transport over `$876.organizations.search`. */
export async function GET(request: NextRequest): Promise<Response> {
  const { response } = await requireConsolePermission('console:orgs')
  if (response) return response

  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (query.length < 2) {
    return apiJson({ data: [] })
  }

  const { data, error } = await $876.organizations.search({ query, limit: 10 })
  if (error) {
    return apiJson(
      { error: error.message ?? 'Search failed.' },
      { status: 400 }
    )
  }
  return apiJson({ data: data?.data ?? [] })
}
