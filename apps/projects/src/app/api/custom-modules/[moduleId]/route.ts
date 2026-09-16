import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projectsErrorStatus } from '@/app/api/_lib/error-status'
import { resolveCallerRoleKeys } from '@/lib/custom-modules/api-access'
import { updateCustomModuleInputSchema } from '@/lib/custom-modules/custom-module-inputs'
import { serviceWithRoleKeys } from '@/lib/custom-modules/service-with-roles'

export const runtime = 'nodejs'

type Props = { params: Promise<{ moduleId: string }> }

async function roleKeys(auth: { userId: string; orgId: string }): Promise<string[]> {
  return resolveCallerRoleKeys(auth.userId, auth.orgId)
}

export async function GET(_request: NextRequest, { params }: Props) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const { moduleId } = await params
  const result = await serviceWithRoleKeys(
    await roleKeys(auth)
  ).customModules.retrieveModule(auth.orgId, decodeURIComponent(moduleId))
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The custom module could not be loaded.' },
      { status: projectsErrorStatus(result.error?.code ?? '') }
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
  const parsed = updateCustomModuleInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid custom module.' }, { status: 422 })

  const { moduleId } = await params
  const result = await serviceWithRoleKeys(
    await roleKeys(auth)
  ).customModules.updateModule(auth.orgId, decodeURIComponent(moduleId), parsed.data)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The custom module could not be updated.' },
      { status: projectsErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { moduleId } = await params
  const result = await serviceWithRoleKeys(
    await roleKeys(auth)
  ).customModules.deleteModule(auth.orgId, decodeURIComponent(moduleId))
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The custom module could not be deleted.' },
      { status: projectsErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
