import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projectCustomFieldInputSchema } from '@/types/work-structure'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

export async function GET() {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const result = await projects.projectCustomFields.list(auth.orgId)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Project fields could not be loaded.' },
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
  const parsed = projectCustomFieldInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid project field.' }, { status: 422 })

  const result = await projects.projectCustomFields.create(
    auth.orgId,
    parsed.data
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ?? 'The project field could not be created.',
      },
      { status: 400 }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
