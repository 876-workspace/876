import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import {
  createLayoutInputSchema,
  listLayoutsQuerySchema,
} from '@/types/layouts'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const params = Object.fromEntries(new URL(request.url).searchParams.entries())
  const parsedQuery = listLayoutsQuerySchema.safeParse(params)
  if (!parsedQuery.success)
    return apiJson({ error: 'Enter a valid layout query.' }, { status: 422 })

  const result = await projects.layouts.list(auth.orgId, parsedQuery.data)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Layouts could not be loaded.' },
      { status: 400 }
    )

  return apiJson({ data: result.data })
}

export async function POST(request: NextRequest) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createLayoutInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid layout.' }, { status: 422 })

  const { definition, ...rest } = parsed.data
  const result = await projects.layouts.create(auth.orgId, {
    ...rest,
    sections: definition.sections,
    ...(definition.rules ? { rules: definition.rules } : {}),
  })
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The layout could not be created.' },
      { status: 400 }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
