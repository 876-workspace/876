import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ notificationId: string }> }

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/notification-not-found' ? 404 : 400
}

export async function POST(_request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const { notificationId } = await params
  const result = await projects.notifications.markRead(
    auth.orgId,
    decodeURIComponent(notificationId)
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ?? 'The notification could not be updated.',
      },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
