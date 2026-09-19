import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { getPlatformClient } from '@/lib/clients/platform'
import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ inviteId: string }> }

export async function DELETE(request: NextRequest, context: RouteContext) {
  const orgSlug = request.nextUrl.searchParams.get('orgSlug')
  if (!orgSlug) return errorResponse('settings/organization-required')

  const ctx = await getManageContext(orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')
  if (!ctx.tenant) return errorResponse('tenant/not-found')

  const { inviteId } = await context.params
  const platform = await getPlatformClient()
  const result = await platform.invites.revoke(ctx.orgId, inviteId)
  if (result.error) return errorResponse(result.error.code)

  return apiJson({ data: result.data })
}
