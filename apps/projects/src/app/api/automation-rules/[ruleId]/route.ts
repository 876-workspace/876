import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { updateAutomationRuleInputSchema } from '@/types/automations'
import { projects } from '@/lib/clients/projects'
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
  const result = await projects.automationRules.retrieve(
    auth.orgId,
    decodeURIComponent(ruleId)
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The rule could not be loaded.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = updateAutomationRuleInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Enter a valid automation rule update.' },
      { status: 422 }
    )

  const { ruleId } = await params
  const result = await projects.automationRules.update(
    auth.orgId,
    decodeURIComponent(ruleId),
    parsed.data
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The rule could not be updated.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { ruleId } = await params
  const result = await projects.automationRules.remove(
    auth.orgId,
    decodeURIComponent(ruleId)
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The rule could not be deleted.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
