import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projectsErrorStatus } from '@/app/api/_lib/error-status'
import { resolveCallerRoleKeys } from '@/lib/custom-modules/api-access'
import { createCustomModuleLinkInputSchema } from '@/types/custom-modules'
import { serviceWithRoleKeys } from '@/lib/custom-modules/service-with-roles'
import type { ApiContext } from '@/types/access'

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
  const result = await serviceWithRoleKeys(roleKeys).customModules.listLinks(
    auth.orgId,
    decodeURIComponent(moduleId),
    decodeURIComponent(recordId)
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Record links could not be loaded.' },
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
  const parsed = createCustomModuleLinkInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid link.' }, { status: 422 })

  const { moduleId, recordId } = await params
  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.createLink(
    auth.orgId,
    decodeURIComponent(moduleId),
    decodeURIComponent(recordId),
    parsed.data
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The link could not be created.' },
      { status: projectsErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
