import type { ProjectsOperatorClient } from '@876/projects/operator'
import type { CreateIssueInput, ListIssuesQuery } from '@876/projects/contracts'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { createProjects } from '@/lib/services/projects'
import { platform } from '@/lib/services/platform'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

const FILTER_KEYS = [
  'project',
  'status',
  'priority',
  'assignee',
  'label',
  'parent',
  'q',
  'updated_since',
  'order',
  'limit',
  'starting_after',
  'ending_before',
] as const

export async function GET(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId } = await context.params
  const filters = Object.fromEntries(
    FILTER_KEYS.flatMap((key) => {
      const value = request.nextUrl.searchParams.get(key)
      return value ? [[key, value]] : []
    })
  ) as ListIssuesQuery

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const projectsClient: ProjectsOperatorClient = createProjects(traceId)
  const { data, error } = await projectsClient.issues.list(
    organizationId,
    filters
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to list issues.' },
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
    .catch(() => null)) as CreateIssueInput | null
  if (!body || typeof body !== 'object' || !body.projectId || !body.title) {
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })
  }

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const projectsClient: ProjectsOperatorClient = createProjects(traceId)
  const { data, error } = await projectsClient.issues.create(
    organizationId,
    body
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to create issue.' },
      { status: 400 }
    )
  }

  await platform.auditEvents
    .create({
      event: 'projects.issue.created',
      appName: '876-console',
      userId: sessionUser?.id ?? null,
      properties: {
        organizationId,
        identifier: data.identifier,
        title: data.title,
      },
    })
    .catch(() => null)

  return apiJson({ data }, { status: 201 })
}
