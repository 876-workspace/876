import type { ProvisioningSetupPolicyReplaceParams } from '@876/core/types/provisioning-policy'
import { apiJson } from '@876/core/api'
import type { AdminProvisioningSetupCreateParams } from '@876/platform/compat'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { workspace } from '@/lib/services/workspace'

export const runtime = 'nodejs'

type CreateSetupRequest = AdminProvisioningSetupCreateParams & {
  policy?: ProvisioningSetupPolicyReplaceParams
}

export async function POST(request: NextRequest) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const body = (await request.json().catch(() => null)) as
    | CreateSetupRequest
    | null
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid provisioning setup.' }, { status: 400 })

  const { policy, ...setupParams } = body
  const result = await workspace.provisioning.setups.create(setupParams)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to create the setup.' },
      { status: 400 }
    )

  if (policy) {
    const policyResult = await workspace.provisioning.setups.replacePolicy(
      result.data.key,
      policy
    )
    if (policyResult.error || !policyResult.data) {
      // Creation is a Console domain operation. Do not leave a half-created
      // setup when its requested initial matching/access policy cannot be saved.
      await workspace.provisioning.setups.purge(result.data.key)
      return apiJson(
        {
          error:
            policyResult.error?.message ??
            'Failed to save the provisioning setup policy.',
        },
        { status: 400 }
      )
    }
  }

  return apiJson({ data: result.data }, { status: 201 })
}
