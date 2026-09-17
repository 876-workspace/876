import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import {
  requireApiPermission,
  type ApiContext,
} from '@/lib/auth/api-permission'
import { projectsErrorStatus } from '@/app/api/_lib/error-status'
import { resolveCallerRoleKeys } from '@/lib/custom-modules/api-access'
import { createDashboardWidgetInputSchema } from '@/types/custom-modules'
import { serviceWithRoleKeys } from '@/lib/custom-modules/service-with-roles'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth: ApiContext = await requireApiPermission('dashboard.view')
  if (auth.response) return auth.response

  const params = Object.fromEntries(new URL(request.url).searchParams.entries())
  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.listWidgets(
    auth.orgId,
    {
      ...(params.moduleId ? { moduleId: params.moduleId } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
    }
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ?? 'Dashboard widgets could not be loaded.',
      },
      { status: projectsErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function POST(request: NextRequest) {
  const auth: ApiContext = await requireApiPermission('dashboard.view')
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createDashboardWidgetInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Enter a valid dashboard widget.' },
      { status: 422 }
    )

  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.createWidget(
    auth.orgId,
    parsed.data
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The widget could not be created.' },
      { status: projectsErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
