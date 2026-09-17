import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { resolveLayoutQuerySchema } from '@/types/layouts'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const params = Object.fromEntries(new URL(request.url).searchParams.entries())
  const parsed = resolveLayoutQuerySchema.safeParse(params)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid layout query.' }, { status: 422 })

  const result = await projects.layouts.resolve(auth.orgId, parsed.data)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The layout could not be resolved.' },
      { status: 400 }
    )

  return apiJson({ data: result.data })
}
