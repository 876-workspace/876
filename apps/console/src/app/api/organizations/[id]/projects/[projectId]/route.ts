import type { ProjectsOperatorClient } from '@876/projects/operator'
import type { UpdateProjectInput } from '@876/projects/contracts'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { createProjects } from '@/lib/clients/projects'
import { platform } from '@/lib/clients/platform'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string; projectId: string }> }

export async function GET(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId, projectId } = await context.params
  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const projectsClient: ProjectsOperatorClient = createProjects(traceId)
  const { data, error } = await projectsClient.projects.retrieve(
    organizationId,
    projectId
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to retrieve project.' },
      { status: error?.code === 'projects/project-not-found' ? 404 : 400 }
    )
  }

  return apiJson({ data })
}

export async function PATCH(request: NextRequest, context: Context) {
  const { id: organizationId, projectId } = await context.params
  const { sessionUser, response } = await requireConsolePermission(
    'console:organizations'
  )
  if (response) return response

  const body = (await request
    .json()
    .catch(() => null)) as UpdateProjectInput | null
  if (!body || typeof body !== 'object') {
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })
  }

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const projectsClient: ProjectsOperatorClient = createProjects(traceId)
  const { data, error } = await projectsClient.projects.update(
    organizationId,
    projectId,
    body
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to update project.' },
      { status: 400 }
    )
  }

  await platform.auditEvents
    .create({
      event: 'projects.project.updated',
      appName: '876-console',
      userId: sessionUser?.id ?? null,
      properties: { organizationId, projectId, changes: Object.keys(body) },
    })
    .catch(() => null)

  return apiJson({ data })
}

export async function DELETE(request: NextRequest, context: Context) {
  const { id: organizationId, projectId } = await context.params
  const { sessionUser, response } = await requireConsolePermission(
    'console:organizations'
  )
  if (response) return response

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const projectsClient: ProjectsOperatorClient = createProjects(traceId)
  const { data, error } = await projectsClient.projects.delete(
    organizationId,
    projectId
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to delete project.' },
      { status: 400 }
    )
  }

  await platform.auditEvents
    .create({
      event: 'projects.project.deleted',
      appName: '876-console',
      userId: sessionUser?.id ?? null,
      properties: { organizationId, projectId },
    })
    .catch(() => null)

  return apiJson({ data })
}
