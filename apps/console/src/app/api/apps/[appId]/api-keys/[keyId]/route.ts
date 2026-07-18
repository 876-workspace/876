import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Params = { params: Promise<{ appId: string; keyId: string }> }

/** Renames an API key. */
export async function PATCH(
  request: NextRequest,
  { params }: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { appId, keyId } = await params
  const body = (await request.json().catch(() => null)) as {
    name?: string | null
  } | null

  const { data, error } = await $876.apiKeys.update(appId, keyId, {
    name: body?.name ?? null,
  })
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to update API key.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}

/** Permanently deletes an API key. */
export async function DELETE(
  _request: NextRequest,
  { params }: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { appId, keyId } = await params
  const { data, error } = await $876.apiKeys.delete(appId, keyId)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to delete API key.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}
