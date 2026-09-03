import type { ProjectsOperatorClient } from '@876/projects/operator'
import type { UpdateIssueInput } from '@876/projects/contracts'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { createProjects } from '@/lib/services/projects'
import { platform } from '@/lib/services/platform'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string; issueRef: string }> }

export async function GET(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId, issueRef } = await context.params
  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const projectsClient: ProjectsOperatorClient = createProjects(traceId)
  const { data, error } = await projectsClient.issues.retrieve(
    organizationId,
    issueRef
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to retrieve issue.' },
      { status: error?.code === 'projects/issue-not-found' ? 404 : 400 }
    )
  }

  return apiJson({ data })
}

export async function PATCH(request: NextRequest, context: Context) {
  const { id: organizationId, issueRef } = await context.params
  const { sessionUser, response } = await requireConsolePermission(
    'console:organizations'
  )
  if (response) return response

  const body = (await request
    .json()
    .catch(() => null)) as UpdateIssueInput | null
  if (!body || typeof body !== 'object') {
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })
  }

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const projectsClient: ProjectsOperatorClient = createProjects(traceId)
  const { data, error } = await projectsClient.issues.update(
    organizationId,
    issueRef,
    body
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to update issue.' },
      { status: 400 }
    )
  }

  await platform.auditEvents
    .create({
      event: 'projects.issue.updated',
      appName: '876-console',
      userId: sessionUser?.id ?? null,
      properties: { organizationId, issueRef, changes: Object.keys(body) },
    })
    .catch(() => null)

  return apiJson({ data })
}

export async function DELETE(request: NextRequest, context: Context) {
  const { id: organizationId, issueRef } = await context.params
  const { sessionUser, response } = await requireConsolePermission(
    'console:organizations'
  )
  if (response) return response

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const projectsClient: ProjectsOperatorClient = createProjects(traceId)
  const { data, error } = await projectsClient.issues.delete(
    organizationId,
    issueRef
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to delete issue.' },
      { status: 400 }
    )
  }

  await platform.auditEvents
    .create({
      event: 'projects.issue.deleted',
      appName: '876-console',
      userId: sessionUser?.id ?? null,
      properties: { organizationId, issueRef },
    })
    .catch(() => null)

  return apiJson({ data })
}
