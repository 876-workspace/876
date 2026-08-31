import { workspace } from '@/lib/services/workspace'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ setupKey: string }> }
) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { setupKey } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid provisioning setup.' }, { status: 400 })

  const result = await workspace.provisioning.setups.update(setupKey, body)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to update the setup.' },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ setupKey: string }> }
) {
  const { response } = await requireConsolePermission('console:danger_zone')
  if (response) return response

  const { setupKey } = await params
  const result = await workspace.provisioning.setups.del(setupKey)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to delete the setup.' },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}
