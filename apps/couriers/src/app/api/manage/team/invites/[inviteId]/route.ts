import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getManageContext } from '@/lib/auth/manage-context'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ inviteId: string }> }

export async function DELETE(request: NextRequest, context: RouteContext) {
  const orgSlug = request.nextUrl.searchParams.get('orgSlug')
  if (!orgSlug)
    return apiJson({ error: 'Organization is required.' }, { status: 422 })

  const ctx = await getManageContext(orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to revoke invites.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const { inviteId } = await context.params
  const platform = await getPlatformClient()
  const result = await platform.orgs.invites.revoke(ctx.orgId, inviteId)
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: 502, code: result.error.code }
    )

  return apiJson({ data: result.data })
}
