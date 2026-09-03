import type { ProjectsOperatorClient } from '@876/projects/operator'
import type { CreateLabelInput } from '@876/projects/contracts'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { createProjects } from '@/lib/services/projects'
import { platform } from '@/lib/services/platform'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId } = await context.params
  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const projectsClient: ProjectsOperatorClient = createProjects(traceId)
  const { data, error } = await projectsClient.labels.list(organizationId)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to list labels.' },
      { status: 400 }
    )
  }

  return apiJson({ data })
}

export async function POST(request: NextRequest, context: Context) {
  const { id: organizationId } = await context.params
  const { sessionUser, response } = await requireConsolePermission(
    'console:organizations'
  )
  if (response) return response

  const body = (await request
    .json()
    .catch(() => null)) as CreateLabelInput | null
  if (!body || typeof body !== 'object' || !body.name || !body.color) {
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })
  }

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const projectsClient: ProjectsOperatorClient = createProjects(traceId)
  const { data, error } = await projectsClient.labels.create(
    organizationId,
    body
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to create label.' },
      { status: 400 }
    )
  }

  await platform.auditEvents
    .create({
      event: 'projects.label.created',
      appName: '876-console',
      userId: sessionUser?.id ?? null,
      properties: { organizationId, name: data.name },
    })
    .catch(() => null)

  return apiJson({ data }, { status: 201 })
}
