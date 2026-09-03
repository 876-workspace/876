import type { ProjectsOperatorClient } from '@876/projects/operator'
import type {
  CreateProjectInput,
  ListProjectsQuery,
} from '@876/projects/contracts'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { createProjects } from '@/lib/services/projects'
import { platform } from '@/lib/services/platform'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

const FILTER_KEYS = [
  'status',
  'lead',
  'q',
  'starting_after',
  'ending_before',
  'limit',
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
  ) as ListProjectsQuery

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const projectsClient: ProjectsOperatorClient = createProjects(traceId)
  const { data, error } = await projectsClient.projects.list(
    organizationId,
    filters
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to list projects.' },
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
    .catch(() => null)) as CreateProjectInput | null
  if (!body || typeof body !== 'object' || !body.name || !body.key) {
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })
  }

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const projectsClient: ProjectsOperatorClient = createProjects(traceId)
  const { data, error } = await projectsClient.projects.create(
    organizationId,
    body
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to create project.' },
      { status: 400 }
    )
  }

  // Audit event for project creation
  await platform.auditEvents
    .create({
      event: 'projects.project.created',
      appName: '876-console',
      userId: sessionUser?.id ?? null,
      properties: { organizationId, key: data.key, name: data.name },
    })
    .catch(() => null)

  return apiJson({ data }, { status: 201 })
}
