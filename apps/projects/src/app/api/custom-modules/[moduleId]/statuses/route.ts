import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { projectsErrorStatus } from '@/app/api/_lib/error-status'
import { resolveCallerRoleKeys } from '@/lib/custom-modules/api-access'
import {
  createCustomModuleStatusInputSchema,
  replaceCustomModuleStatusesInputSchema,
} from '@/types/custom-modules'
import { serviceWithRoleKeys } from '@/lib/custom-modules/service-with-roles'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Props = { params: Promise<{ moduleId: string }> }

export async function GET(_request: NextRequest, { params }: Props) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const { moduleId } = await params
  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.listStatuses(
    auth.orgId,
    decodeURIComponent(moduleId)
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error: result.error?.message ?? 'Module statuses could not be loaded.',
      },
      { status: projectsErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function POST(request: NextRequest, { params }: Props) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createCustomModuleStatusInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid status.' }, { status: 422 })

  const { moduleId } = await params
  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const result = await serviceWithRoleKeys(roleKeys).customModules.createStatus(
    auth.orgId,
    decodeURIComponent(moduleId),
    parsed.data
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The status could not be created.' },
      { status: projectsErrorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data }, { status: 201 })
}

/**
 * Replaces the module's status pipeline with the ordered list the
 * `StatusEditor` posts, reconciling creates, updates, deletes, and order.
 */
export async function PUT(request: NextRequest, { params }: Props) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = replaceCustomModuleStatusesInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter at least one status.' }, { status: 422 })

  const { moduleId } = await params
  const decodedId = decodeURIComponent(moduleId)
  const roleKeys = await resolveCallerRoleKeys(auth.userId, auth.orgId)
  const service = serviceWithRoleKeys(roleKeys).customModules

  const existing = await service.listStatuses(auth.orgId, decodedId)
  if (existing.error || !existing.data)
    return apiJson(
      {
        error:
          existing.error?.message ?? 'Module statuses could not be loaded.',
      },
      { status: projectsErrorStatus(existing.error?.code ?? '') }
    )

  const byKey = new Map(
    existing.data.data.map((status) => [status.key, status])
  )
  for (const [index, desired] of parsed.data.statuses.entries()) {
    const current = byKey.get(desired.key)
    if (!current) {
      const created = await service.createStatus(auth.orgId, decodedId, {
        key: desired.key,
        label: desired.label,
        category: desired.category,
        position: index,
        ...(index === 0 ? { isDefault: true } : {}),
      })
      if (created.error || !created.data)
        return apiJson(
          {
            error: created.error?.message ?? 'The statuses could not be saved.',
          },
          { status: projectsErrorStatus(created.error?.code ?? '') }
        )
      byKey.set(desired.key, created.data)
      continue
    }
    if (
      current.label !== desired.label ||
      current.category !== desired.category
    ) {
      const updated = await service.updateStatus(
        auth.orgId,
        decodedId,
        current.id,
        {
          label: desired.label,
          category: desired.category,
        }
      )
      if (updated.error || !updated.data)
        return apiJson(
          {
            error: updated.error?.message ?? 'The statuses could not be saved.',
          },
          { status: projectsErrorStatus(updated.error?.code ?? '') }
        )
      byKey.set(desired.key, updated.data)
    }
  }

  const wanted = new Set(parsed.data.statuses.map((status) => status.key))
  for (const current of existing.data.data) {
    if (wanted.has(current.key)) continue
    const removed = await service.deleteStatus(
      auth.orgId,
      decodedId,
      current.id
    )
    if (removed.error)
      return apiJson(
        { error: removed.error?.message ?? 'The statuses could not be saved.' },
        { status: projectsErrorStatus(removed.error?.code ?? '') }
      )
  }

  const orderedIds = parsed.data.statuses.map(
    (status) => byKey.get(status.key)?.id ?? ''
  )
  if (orderedIds.some((id) => id === ''))
    return apiJson(
      { error: 'The statuses could not be ordered.' },
      { status: 400 }
    )

  const reordered = await service.reorderStatuses(
    auth.orgId,
    decodedId,
    orderedIds
  )
  if (reordered.error || !reordered.data)
    return apiJson(
      {
        error: reordered.error?.message ?? 'The statuses could not be ordered.',
      },
      { status: projectsErrorStatus(reordered.error?.code ?? '') }
    )

  return apiJson({ data: reordered.data.data })
}
