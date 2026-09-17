import 'server-only'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { handleFollow } from '@/app/api/_lib/follow-route'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string }> }

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const { projectId } = await params
  const subjectId = decodeURIComponent(projectId)
  return handleFollow(request, {
    orgId: auth.orgId,
    userId: auth.userId,
    subjectType: 'project',
    subjectId,
  })
}
