import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ ruleId: string }> }

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/automation-rule-not-found' ? 404 : 400
}

export async function GET(_request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const { ruleId } = await params
  const result = await projects.automationRules.listRuns(
    auth.orgId,
    decodeURIComponent(ruleId)
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Runs could not be loaded.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
