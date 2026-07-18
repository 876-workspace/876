import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

/** Creates a user. If organization_name is provided, also creates the org and
 *  an owner membership. */
export async function POST(request: NextRequest): Promise<Response> {
  const { response } = await requireConsolePermission('console:users')
  if (response) return response

  const body = (await request.json().catch(() => null)) as {
    email?: string
    first_name?: string
    last_name?: string
    middle_name?: string | null
    username?: string | null
    organization_name?: string | null
  } | null

  if (!body?.email || !body.first_name || !body.last_name) {
    return apiJson(
      { error: 'email, first_name, and last_name are required.' },
      { status: 400 }
    )
  }

  const result = await service.users.create({
    email: body.email,
    first_name: body.first_name,
    last_name: body.last_name,
    middle_name: body.middle_name,
    username: body.username,
    organization_name: body.organization_name,
  })

  if (result.error !== null) {
    return apiJson({ error: result.error }, { status: result.status ?? 400 })
  }

  if (result.warning) {
    return apiJson(
      { data: result.data, warning: result.warning },
      { status: 207 }
    )
  }

  return apiJson({ data: result.data })
}
