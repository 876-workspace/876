import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { updateProjectCustomFieldInputSchema } from '@/types/work-structure'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/project-custom-field-not-found' ||
    code === 'projects/custom-field-not-found'
    ? 404
    : 400
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = updateProjectCustomFieldInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Enter a valid project field update.' },
      { status: 422 }
    )

  const { id } = await params
  const result = await projects.projectCustomFields.update(
    auth.orgId,
    decodeURIComponent(id),
    parsed.data
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ?? 'The project field could not be updated.',
      },
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

  const { id } = await params
  const result = await projects.projectCustomFields.delete(
    auth.orgId,
    decodeURIComponent(id)
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ?? 'The project field could not be deleted.',
      },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
