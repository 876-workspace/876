import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'
import { isAppStatus } from '@/lib/app-status'

export const runtime = 'nodejs'

type Context = { params: Promise<{ appId: string }> }

/** Updates a registered app. */
export async function PATCH(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { appId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })
  }

  const status = 'status' in body ? body.status : null
  if (status !== null && !isAppStatus(status)) {
    return apiJson({ error: 'Invalid app status.' }, { status: 400 })
  }

  const { data, error } = await $876.apps.update(appId, body)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to update app.' },
      { status: 400 }
    )
  }

  return apiJson({ data })
}

/** Deletes a registered app. */
export async function DELETE(
  _request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { appId } = await context.params
  const { data, error } = await $876.apps.delete(appId)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to delete app.' },
      { status: 400 }
    )
  }

  return apiJson({ data })
}
