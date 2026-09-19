import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

const createLabelSchema = z.strictObject({
  name: z.string().trim().min(1).max(60),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  description: z.string().trim().max(500).nullable().optional(),
})

export async function POST(request: NextRequest) {
  const auth: ApiContext = await requireApiAccess({
    module: 'issues',
    permission: 'labels.create',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createLabelSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a label name.' }, { status: 422 })

  const result = await projects.labels.create(auth.orgId, parsed.data)
  if (result.error)
    return apiJson({ error: result.error.message }, { status: 400 })

  return apiJson({ data: result.data }, { status: 201 })
}
