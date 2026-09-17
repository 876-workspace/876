import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projectsErrorStatus } from '@/app/api/_lib/error-status'
import { resolveCallerRoleKeys } from '@/lib/custom-modules/api-access'
import { createCustomModuleInputSchema } from '@/types/custom-modules'
import { serviceWithRoleKeys } from '@/lib/custom-modules/service-with-roles'

export const runtime = 'nodejs'

export async function GET() {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.listModules(
    auth.orgId
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Custom modules could not be loaded.' },
      { status: projectsErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function POST(request: NextRequest) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createCustomModuleInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid custom module.' }, { status: 422 })

  const result = await serviceWithRoleKeys([]).customModules.createModule(
    auth.orgId,
    parsed.data
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ?? 'The custom module could not be created.',
      },
      { status: projectsErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
