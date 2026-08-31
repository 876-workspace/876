import { workspace } from '@/lib/services/workspace'
import { apiJson } from '@876/core/api'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ setupKey: string }> }
) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { setupKey } = await params
  const result = await workspace.provisioning.publish('finance', setupKey)
  if (result.error || !result.data)
    return apiJson(
      {
        error: result.error?.message ?? 'Failed to publish the setup defaults.',
      },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}
