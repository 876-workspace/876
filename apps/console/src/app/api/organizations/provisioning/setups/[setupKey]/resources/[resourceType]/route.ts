import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { workspace } from '@/lib/services/workspace'
import {
  isProvisioningSetupResourceType,
  type ProvisioningSetupResourceCreateParams,
} from '@/types/provisioning'

export const runtime = 'nodejs'

type Context = {
  params: Promise<{ setupKey: string; resourceType: string }>
}

function invalidResourceType() {
  return apiJson(
    { error: 'Unknown provisioning resource type.' },
    { status: 404 }
  )
}

export async function GET(_request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { setupKey, resourceType } = await context.params
  if (!isProvisioningSetupResourceType(resourceType))
    return invalidResourceType()

  const result = await workspace.provisioning.resources
    .forType(resourceType)
    .list(setupKey)
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ?? 'Failed to list provisioning resources.',
      },
      { status: 400 }
    )

  return apiJson({ data: result.data })
}

export async function POST(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { setupKey, resourceType } = await context.params
  if (!isProvisioningSetupResourceType(resourceType))
    return invalidResourceType()

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson(
      { error: 'Invalid provisioning resource.' },
      { status: 400 }
    )

  const result = await workspace.provisioning.resources
    .forType(resourceType)
    .create(setupKey, body as ProvisioningSetupResourceCreateParams)
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ?? 'Failed to create provisioning resource.',
      },
      { status: 400 }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
