import 'server-only'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { handleFollow } from '@/app/api/_lib/follow-route'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ issueRef: string }> }

export async function POST(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'issues',
    permission: 'issues.view',
  })
  if (auth.response) return auth.response

  const { issueRef } = await params
  const subjectId = decodeURIComponent(issueRef)
  return handleFollow(request, {
    orgId: auth.orgId,
    userId: auth.userId,
    subjectType: 'work-item',
    subjectId,
  })
}
