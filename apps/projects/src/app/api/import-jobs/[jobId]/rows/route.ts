import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { integration } from '@/lib/services/integration'

export const runtime = 'nodejs'

type Context = { params: Promise<{ jobId: string }> }

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/tenant-not-found' ||
    code === 'projects/import-job-not-found'
    ? 404
    : 400
}

export async function GET(_request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const { jobId } = await params
  const result = await integration.listImportJobRows(
    auth.orgId,
    decodeURIComponent(jobId)
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Import rows could not be loaded.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
