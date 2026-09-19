import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { integration } from '@/lib/clients/integration'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ jobId: string }> }

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/tenant-not-found' ||
    code === 'projects/import-job-not-found'
    ? 404
    : 400
}

export async function POST(_request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { jobId } = await params
  const result = await integration.commitImportJob(
    auth.orgId,
    decodeURIComponent(jobId)
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The import could not be committed.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
