import 'server-only'

import { apiJson } from '@876/core/api'

import { templateFailure } from '@/app/api/_lib/template-api'
import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

export async function GET() {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const result = await projects.projectTemplates.list(auth.orgId)
  if (result.error || !result.data)
    return templateFailure(result.error, 'Templates could not be loaded.')

  return apiJson({ data: result.data })
}
