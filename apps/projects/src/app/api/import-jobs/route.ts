import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { createImportJobInputSchema } from '@/types/integrations'
import { integration } from '@/lib/services/integration'

export const runtime = 'nodejs'

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/tenant-not-found' ||
    code === 'projects/import-job-not-found'
    ? 404
    : 400
}

export async function GET() {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const result = await integration.listImportJobs(auth.orgId)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Import jobs could not be loaded.' },
      { status: errorStatus(result.error?.code ?? '') }
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
  const parsed = createImportJobInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      {
        error:
          'Enter a valid import source and file content (5 MB or smaller).',
      },
      { status: 422 }
    )

  const result = await integration.createImportJob(auth.orgId, {
    source: parsed.data.source,
    ...(parsed.data.projectId !== undefined
      ? { projectId: parsed.data.projectId }
      : {}),
    ...(parsed.data.filename !== undefined
      ? { filename: parsed.data.filename }
      : {}),
    content: parsed.data.content,
  })
  if (result.error || !result.data)
    return apiJson(
      {
        error: result.error?.message ?? 'The import job could not be created.',
      },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
