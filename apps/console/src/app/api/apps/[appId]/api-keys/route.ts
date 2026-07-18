import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Params = { params: Promise<{ appId: string }> }

/** Creates an API key for an app. Returns the plaintext key once. */
export async function POST(
  request: NextRequest,
  { params }: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { appId } = await params
  const body = (await request.json().catch(() => null)) as {
    name?: string
    expires_at?: number
  } | null

  const { data, error } = await $876.apiKeys.create(appId, {
    name: body?.name,
    expires_at: body?.expires_at,
  })
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to create API key.' },
      { status: 400 }
    )
  }
  return apiJson({ data }, { status: 201 })
}
