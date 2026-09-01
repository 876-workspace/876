import { workspace } from '@/lib/services/workspace'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { CONSOLE_DANGER_ZONE_PERMISSION } from '@/lib/permissions'

export const runtime = 'nodejs'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ setupKey: string }> }
) {
  const { response } = await requireConsolePermission(
    CONSOLE_DANGER_ZONE_PERMISSION
  )
  if (response) return response

  const { setupKey } = await params
  const result = await workspace.provisioning.setups.purge(setupKey)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to purge the setup.' },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}
