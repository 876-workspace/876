import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

const createProjectSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  key: z.string().trim().min(2).max(10).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  status: z
    .enum(['planned', 'active', 'paused', 'completed', 'canceled'])
    .optional(),
})

export async function POST(request: NextRequest) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.create',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createProjectSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a project name.' }, { status: 422 })

  const result = await projects.projects.create(auth.orgId, parsed.data)
  if (result.error)
    return apiJson({ error: result.error.message }, { status: 400 })

  return apiJson({ data: result.data }, { status: 201 })
}
