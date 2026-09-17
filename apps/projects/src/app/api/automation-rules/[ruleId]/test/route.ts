import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { testAutomationRuleInputSchema } from '@/types/automations'
import { projects } from '@/lib/services/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ ruleId: string }> }

function errorStatus(code: string): 400 | 404 {
  if (
    code === 'projects/automation-rule-not-found' ||
    code === 'projects/automation-subject-not-found'
  )
    return 404
  return 400
}

export async function POST(request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = testAutomationRuleInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Enter a work item identifier to test against.' },
      { status: 422 }
    )

  const { ruleId } = await params
  const result = await projects.automationRules.test(
    auth.orgId,
    decodeURIComponent(ruleId),
    parsed.data
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The rule could not be tested.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
