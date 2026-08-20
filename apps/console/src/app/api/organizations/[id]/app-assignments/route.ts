import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

/** Lists app assignments for an organization. */
export async function GET(
  request: NextRequest,
  { params }: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id') ?? undefined
  const appId = searchParams.get('app_id') ?? undefined
  const includeRevoked = searchParams.get('include_revoked') === 'true'

  const { data, error } = await $876.appAssignments.admin.list(id, {
    userId,
    appId,
    includeRevoked,
  })

  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to list app assignments.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}

/** Creates an app assignment for an organization member. */
export async function POST(
  request: NextRequest,
  { params }: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id } = await params
  const body = (await request.json().catch(() => null)) as {
    userId?: string
    user_id?: string
    appId?: string
    app_id?: string
    appSlug?: string
    app_slug?: string
  } | null

  const userId = body?.userId ?? body?.user_id
  const appId = body?.appId ?? body?.app_id
  const appSlug = body?.appSlug ?? body?.app_slug

  if (!userId || (!appId && !appSlug)) {
    return apiJson(
      { error: 'user_id and app_id (or app_slug) are required.' },
      { status: 400 }
    )
  }

  const { data, error } = await $876.appAssignments.admin.create(id, {
    user_id: userId,
    ...(appId ? { app_id: appId } : {}),
    ...(appSlug ? { app_slug: appSlug } : {}),
  })

  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to create app assignment.' },
      { status: 400 }
    )
  }
  return apiJson({ data }, { status: 201 })
}
