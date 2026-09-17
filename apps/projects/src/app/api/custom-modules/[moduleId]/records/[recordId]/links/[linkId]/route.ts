import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projectsErrorStatus } from '@/app/api/_lib/error-status'
import { resolveCallerRoleKeys } from '@/lib/custom-modules/api-access'
import { serviceWithRoleKeys } from '@/lib/custom-modules/service-with-roles'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Props = {
  params: Promise<{ moduleId: string; recordId: string; linkId: string }>
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { moduleId, recordId, linkId } = await params
  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.deleteLink(
    auth.orgId,
    decodeURIComponent(moduleId),
    decodeURIComponent(recordId),
    decodeURIComponent(linkId)
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The link could not be deleted.' },
      { status: projectsErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
