import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { createAutomationRuleInputSchema } from '@/types/automations'
import { projects } from '@/lib/clients/projects'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/automation-rule-not-found' ? 404 : 400
}

export async function GET() {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const result = await projects.automationRules.list(auth.orgId)
  if (result.error || !result.data)
    return apiJson(
      {
        error: result.error?.message ?? 'Automation rules could not be loaded.',
      },
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
  const parsed = createAutomationRuleInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid automation rule.' }, { status: 422 })

  const result = await projects.automationRules.create(auth.orgId, parsed.data)
  if (result.error || !result.data)
    return apiJson(
      {
        error: result.error?.message ?? 'The rule could not be created.',
      },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
