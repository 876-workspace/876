import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { putBlueprintInputSchema } from '@/types/automations'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ workItemTypeId: string }> }

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/work-item-type-not-found' ? 404 : 400
}

export async function GET(_request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const { workItemTypeId } = await params
  const result = await projects.workflows.getBlueprint(
    auth.orgId,
    decodeURIComponent(workItemTypeId)
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The blueprint could not be loaded.' },
      { status: errorStatus(result.error?.code ?? '') }
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
  const parsed = putBlueprintInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid blueprint.' }, { status: 422 })

  const { workItemTypeId } = await params
  const result = await projects.workflows.putBlueprint(
    auth.orgId,
    decodeURIComponent(workItemTypeId),
    {
      transitions: parsed.data.transitions.map((transition) => ({
        fromStateKey: transition.fromStateKey ?? null,
        toStateKey: transition.toStateKey,
        name: transition.name,
        requiredPermission: transition.requiredPermission ?? null,
        requiredFieldKeys: transition.requiredFieldKeys ?? [],
        requiresComment: transition.requiresComment ?? false,
      })),
    }
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The blueprint could not be saved.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
