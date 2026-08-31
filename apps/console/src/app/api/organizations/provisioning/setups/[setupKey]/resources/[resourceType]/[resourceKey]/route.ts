import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { workspace } from '@/lib/services/workspace'
import { isProvisioningSetupResourceType } from '@/types/provisioning'

export const runtime = 'nodejs'

type Context = {
  params: Promise<{
    setupKey: string
    resourceType: string
    resourceKey: string
  }>
}

function invalidResourceType() {
  return apiJson({ error: 'Unknown provisioning resource type.' }, { status: 404 })
}

export async function GET(_request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { setupKey, resourceType, resourceKey } = await context.params
  if (!isProvisioningSetupResourceType(resourceType)) return invalidResourceType()

  const result = await workspace.provisioning.resources
    .forType(resourceType)
    .retrieve(setupKey, resourceKey)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Provisioning resource was not found.' },
      { status: 404 }
    )

  return apiJson({ data: result.data })
}

export async function PATCH(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { setupKey, resourceType, resourceKey } = await context.params
  if (!isProvisioningSetupResourceType(resourceType)) return invalidResourceType()

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid provisioning resource update.' }, { status: 400 })

  const result = await workspace.provisioning.resources
    .forType(resourceType)
    .update(setupKey, resourceKey, body)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to update provisioning resource.' },
      { status: 400 }
    )

  return apiJson({ data: result.data })
}

export async function DELETE(_request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { setupKey, resourceType, resourceKey } = await context.params
  if (!isProvisioningSetupResourceType(resourceType)) return invalidResourceType()

  const result = await workspace.provisioning.resources
    .forType(resourceType)
    .delete(setupKey, resourceKey)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to delete provisioning resource.' },
      { status: 400 }
    )

  return apiJson({ data: result.data })
}
