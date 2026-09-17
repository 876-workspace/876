import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ layoutId: string }> }

export async function POST(_request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { layoutId } = await params
  const result = await projects.layouts.makeDefault(
    auth.orgId,
    decodeURIComponent(layoutId)
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error: result.error?.message ?? 'The layout could not be made default.',
      },
      { status: result.error?.code === 'projects/layout-not-found' ? 404 : 400 }
    )

  return apiJson({ data: result.data })
}
