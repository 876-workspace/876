import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projectsErrorStatus } from '@/app/api/_lib/error-status'
import { resolveCallerRoleKeys } from '@/lib/custom-modules/api-access'
import { createCustomModuleFieldInputSchema } from '@/types/custom-modules'
import { serviceWithRoleKeys } from '@/lib/custom-modules/service-with-roles'

export const runtime = 'nodejs'

type Props = { params: Promise<{ moduleId: string }> }

export async function GET(_request: NextRequest, { params }: Props) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const { moduleId } = await params
  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.listFields(
    auth.orgId,
    decodeURIComponent(moduleId)
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Module fields could not be loaded.' },
      { status: projectsErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function POST(request: NextRequest, { params }: Props) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createCustomModuleFieldInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid module field.' }, { status: 422 })

  const { moduleId } = await params
  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.createField(
    auth.orgId,
    decodeURIComponent(moduleId),
    parsed.data
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The field could not be created.' },
      { status: projectsErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
