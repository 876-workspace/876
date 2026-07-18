import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

/** Creates a role. Persists to MC DB via `client.roles` (Console DB). */
export async function POST(request: NextRequest): Promise<Response> {
  const { response } = await requireConsolePermission('console:settings')
  if (response) return response

  const body = (await request.json().catch(() => null)) as {
    name?: string
    displayName?: string
    description?: string
    permissions?: string[]
  } | null
  if (!body?.name || !body.displayName) {
    return apiJson(
      { error: 'Name and display name are required.' },
      { status: 400 }
    )
  }

  const result = await service.roles.create(
    body as {
      name: string
      displayName: string
      description?: string
      permissions?: string[]
    }
  )
  if (result.error) {
    return apiJson({ error: result.error }, { status: result.status ?? 400 })
  }
  return apiJson({ data: result.data })
}
