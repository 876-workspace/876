import { platform } from '@/lib/services/platform'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

/**
 * Restores a soft-deleted organization: clears the tombstone, re-opens the
 * memberships the delete closed, and re-registers the Billing customer as active.
 */
export async function POST(
  _request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id } = await context.params

  const { data, error } = await platform.organizations.restore(id)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to restore organization.' },
      { status: 400 }
    )
  }

  return apiJson({ data })
}
