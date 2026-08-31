import { workspace } from '@/lib/services/workspace'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

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

  const { data, error } = await workspace.appAssignments.list(id, {
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

  // The browser client exposes a simple array for this non-paginated resource;
  // do not leak the Core API list envelope through the Console-owned route.
  return apiJson({ data: data.data })
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
    userId?: unknown
    appId?: unknown
    appSlug?: unknown
  } | null

  const userId = typeof body?.userId === 'string' ? body.userId.trim() : ''
  const appId = typeof body?.appId === 'string' ? body.appId.trim() : ''
  const appSlug = typeof body?.appSlug === 'string' ? body.appSlug.trim() : ''

  if (!userId || Boolean(appId) === Boolean(appSlug)) {
    return apiJson(
      { error: 'userId and exactly one of appId or appSlug are required.' },
      { status: 400 }
    )
  }

  const { data, error } = await workspace.appAssignments.assign(id, {
    user_id: userId,
    ...(appId ? { app_id: appId } : { app_slug: appSlug }),
  })

  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to create app assignment.' },
      { status: 400 }
    )
  }
  return apiJson({ data }, { status: 201 })
}
