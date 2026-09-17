import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { updateLayoutInputSchema } from '@/types/layouts'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ layoutId: string }> }

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/layout-not-found' ? 404 : 400
}

export async function GET(_request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const { layoutId } = await params
  const result = await projects.layouts.retrieve(
    auth.orgId,
    decodeURIComponent(layoutId)
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The layout could not be loaded.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = updateLayoutInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid layout update.' }, { status: 422 })

  const { layoutId } = await params
  const { definition, ...rest } = parsed.data
  const result = await projects.layouts.update(
    auth.orgId,
    decodeURIComponent(layoutId),
    {
      ...rest,
      ...(definition
        ? {
            sections: definition.sections,
            rules: definition.rules ?? [],
          }
        : {}),
    }
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The layout could not be updated.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { layoutId } = await params
  const result = await projects.layouts.delete(
    auth.orgId,
    decodeURIComponent(layoutId)
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The layout could not be deleted.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
