import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { resolveCallerRoleKeys, serviceErrorStatus } from '@/lib/custom-modules/api-access'
import { updateCustomRecordInputSchema } from '@/lib/custom-modules/custom-module-inputs'
import { serviceWithRoleKeys } from '@/lib/custom-modules/service-with-roles'

export const runtime = 'nodejs'

type Props = { params: Promise<{ moduleId: string; recordId: string }> }

export async function GET(_request: NextRequest, { params }: Props) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const { moduleId, recordId } = await params
  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.retrieveRecord(
    auth.orgId,
    decodeURIComponent(moduleId),
    decodeURIComponent(recordId)
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The record could not be loaded.' },
      { status: serviceErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function PATCH(request: NextRequest, { params }: Props) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = updateCustomRecordInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid record.' }, { status: 422 })

  const { moduleId, recordId } = await params
  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.updateRecord(
    auth.orgId,
    decodeURIComponent(moduleId),
    decodeURIComponent(recordId),
    parsed.data
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The record could not be updated.' },
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

  const { moduleId, recordId } = await params
  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.deleteRecord(
    auth.orgId,
    decodeURIComponent(moduleId),
    decodeURIComponent(recordId)
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The record could not be deleted.' },
      { status: serviceErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
