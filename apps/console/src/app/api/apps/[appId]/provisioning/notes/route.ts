import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'
type Context = { params: Promise<{ appId: string }> }

export async function POST(request: NextRequest, context: Context) {
  const access = await requireConsolePermission('console:apps')
  if (access.response) return access.response
  const { appId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body.body !== 'string' || !body.body.trim())
    return apiJson({ error: 'Note text is required.' }, { status: 400 })
  const result = await $876.provisioning.notes.create('application', appId, {
    body: body.body.trim(),
    author_user_id: access.caller.id,
  })
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to add note.' },
      { status: 400 }
    )
  return apiJson({ data: result.data }, { status: 201 })
}
