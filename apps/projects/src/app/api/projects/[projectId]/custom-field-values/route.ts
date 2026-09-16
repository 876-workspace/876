import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projectCustomFieldValuesInputSchema } from '@/lib/project-custom-field-inputs'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ projectId: string }> }

export async function GET(_request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const { projectId } = await params
  const result = await projects.projectCustomFields.values.list(
    auth.orgId,
    decodeURIComponent(projectId)
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ?? 'Project field values could not be loaded.',
      },
      { status: 400 }
    )

  return apiJson({ data: result.data })
}

export async function PUT(request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = projectCustomFieldValuesInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Enter valid project field values.' },
      { status: 422 }
    )

  const { projectId } = await params
  const result = await projects.projectCustomFields.values.set(
    auth.orgId,
    decodeURIComponent(projectId),
    { ...parsed.data, updatedBy: auth.userId }
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ??
          'Project field values could not be saved.',
      },
      { status: 400 }
    )

  return apiJson({ data: result.data })
}
