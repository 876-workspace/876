import 'server-only'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { handleVisibility } from '@/app/api/_lib/visibility-route'

export const runtime = 'nodejs'

type Context = { params: Promise<{ issueRef: string }> }

export async function PATCH(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { issueRef } = await params
  return handleVisibility(request, {
    orgId: auth.orgId,
    subject: { kind: 'issue', issueRef: decodeURIComponent(issueRef) },
  })
}
