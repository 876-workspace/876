import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiPermission, type ApiContext } from '@/lib/auth/api-permission'
import { resolveCallerRoleKeys, serviceErrorStatus } from '@/lib/custom-modules/api-access'
import { updateDashboardWidgetInputSchema } from '@/lib/custom-modules/custom-module-inputs'
import { serviceWithRoleKeys } from '@/lib/custom-modules/service-with-roles'

export const runtime = 'nodejs'

type Props = { params: Promise<{ widgetId: string }> }

export async function PATCH(request: NextRequest, { params }: Props) {
  const auth: ApiContext = await requireApiPermission('dashboard.view')
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = updateDashboardWidgetInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid dashboard widget.' }, { status: 422 })

  const { widgetId } = await params
  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.updateWidget(
    auth.orgId,
    decodeURIComponent(widgetId),
    parsed.data
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The widget could not be updated.' },
      { status: serviceErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  const auth: ApiContext = await requireApiPermission('dashboard.view')
  if (auth.response) return auth.response

  const { widgetId } = await params
  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.deleteWidget(
    auth.orgId,
    decodeURIComponent(widgetId)
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The widget could not be deleted.' },
      { status: serviceErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
