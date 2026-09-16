import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { resolveCallerRoleKeys, serviceErrorStatus } from '@/lib/custom-modules/api-access'
import { updateCustomModuleFieldInputSchema } from '@/lib/custom-modules/custom-module-inputs'
import { serviceWithRoleKeys } from '@/lib/custom-modules/service-with-roles'

export const runtime = 'nodejs'

type Props = { params: Promise<{ moduleId: string; fieldId: string }> }

export async function PATCH(request: NextRequest, { params }: Props) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = updateCustomModuleFieldInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid module field.' }, { status: 422 })

  const { moduleId, fieldId } = await params
  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.updateField(
    auth.orgId,
    decodeURIComponent(moduleId),
    decodeURIComponent(fieldId),
    parsed.data
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The field could not be updated.' },
      { status: serviceErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { moduleId, fieldId } = await params
  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.deleteField(
    auth.orgId,
    decodeURIComponent(moduleId),
    decodeURIComponent(fieldId)
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The field could not be deleted.' },
      { status: serviceErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
