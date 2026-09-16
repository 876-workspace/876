import 'server-only'

import { apiJson } from '@876/core/api'
import { issueDependencyTypeSchema } from '@876/projects/contracts'
import { z } from 'zod'

import { projectsErrorStatus } from '@/app/api/_lib/error-status'
import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

type Context = { params: Promise<{ issueRef: string; dependencyId: string }> }

const updateDependencySchema = z
  .strictObject({
    type: issueDependencyTypeSchema.optional(),
    lagMinutes: z.number().int().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one dependency field is required.',
  })

export async function PATCH(request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'issues',
    permission: 'issues.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = updateDependencySchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Enter a valid dependency update.' },
      { status: 422 }
    )

  const { issueRef, dependencyId } = await params
  const result = await projects.issueDependencies.update(
    auth.orgId,
    decodeURIComponent(issueRef),
    decodeURIComponent(dependencyId),
    parsed.data
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ??
          'The work item dependency could not be updated.',
      },
      { status: projectsErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'issues',
    permission: 'issues.edit',
  })
  if (auth.response) return auth.response

  const { issueRef, dependencyId } = await params
  const result = await projects.issueDependencies.delete(
    auth.orgId,
    decodeURIComponent(issueRef),
    decodeURIComponent(dependencyId)
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ??
          'The work item dependency could not be removed.',
      },
      { status: projectsErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
