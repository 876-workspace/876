import 'server-only'

import { apiJson } from '@876/core/api'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

export async function GET() {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const result = await projects.notifications.list(auth.orgId, auth.userId)
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ?? 'Notifications could not be loaded.',
      },
      { status: 400 }
    )

  return apiJson({ data: result.data })
}
