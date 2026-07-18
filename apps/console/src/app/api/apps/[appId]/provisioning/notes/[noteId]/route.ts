import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'
type Context = { params: Promise<{ appId: string; noteId: string }> }

export async function DELETE(_request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response
  const { appId, noteId } = await context.params
  const result = await $876.provisioning.notes.delete(
    'application',
    appId,
    noteId
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to delete note.' },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}
