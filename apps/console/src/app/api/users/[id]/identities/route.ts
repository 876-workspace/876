import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { $876 } from '@/lib/876'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

export async function GET(
  _request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:users')
  if (response) return response

  const { id } = await context.params
  const memberships = await $876.memberships.list({ user_id: id, limit: 50 })
  if (memberships.error || !memberships.data)
    return apiJson(
      { error: memberships.error?.message ?? 'Failed to load identities.' },
      { status: 400 }
    )

  const data = await Promise.all(
    memberships.data.data.map(async (membership) => {
      const org = await $876.orgs.retrieve(membership.organization_id)
      return { membership, org: org.error ? null : org.data }
    })
  )

  return apiJson({ data })
}
