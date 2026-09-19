import { apiJson } from '@876/core/api'
import type { ProvisioningSetupPolicyReplaceParams } from '@876/core/types/provisioning-policy'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { workspace } from '@/lib/clients/workspace'

export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ setupKey: string }> }
) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { setupKey } = await params
  const result = await workspace.provisioning.setups.retrievePolicy(setupKey)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to load the setup policy.' },
      { status: 400 }
    )

  return apiJson({ data: result.data })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ setupKey: string }> }
) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { setupKey } = await params
  const body = (await request.json().catch(() => null)) as
    | ProvisioningSetupPolicyReplaceParams
    | null
  if (
    !body ||
    !Array.isArray(body.conditions) ||
    !Array.isArray(body.entitlements)
  )
    return apiJson(
      { error: 'Invalid provisioning setup policy.' },
      { status: 400 }
    )

  const result = await workspace.provisioning.setups.replacePolicy(setupKey, body)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to update the setup policy.' },
      { status: 400 }
    )

  return apiJson({ data: result.data })
}
