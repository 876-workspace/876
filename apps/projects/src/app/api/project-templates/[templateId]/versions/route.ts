import 'server-only'

import { apiJson } from '@876/core/api'

import { templateFailure } from '@/app/api/_lib/template-api'
import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ templateId: string }> }

export async function GET(_request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const { templateId } = await params
  const result = await projects.projectTemplates.versions(
    auth.orgId,
    decodeURIComponent(templateId)
  )
  if (result.error || !result.data)
    return templateFailure(result.error, 'The versions could not be loaded.')

  return apiJson({ data: result.data })
}
