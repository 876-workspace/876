import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { getAppError, getError } from '@/lib/errors'
import { getFeatures } from '@/lib/features'
import { storage } from '@/lib/services/storage'
import { organizationLogoUploadStartSchema } from '@/types/storage'

export const runtime = 'nodejs'

function storageErrorResponse(error: { code: string }) {
  const definition = getError(error.code)

  return apiJson(
    { data: null, error: getAppError(error.code) },
    { status: definition.httpStatus }
  )
}

/** Opens a signed organization-logo upload after authorizing this org actor. */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return storageErrorResponse({
      code: 'storage/invalid-request',
    })
  }

  const parsed = organizationLogoUploadStartSchema.safeParse(body)
  if (!parsed.success)
    return storageErrorResponse({
      code: 'storage/invalid-request',
    })

  const { orgSlug, ...file } = parsed.data

  const ctx = await getManageContext(orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')

  const features = await getFeatures({
    userId: ctx.userId,
    organizationId: ctx.orgId,
  })
  if (!features.storageOrgLogoUpload)
    return storageErrorResponse({
      code: 'storage/forbidden',
    })

  const result = await storage.uploads.create({
    route_key: 'organization.primaryLogo',
    owner_type: 'organization',
    owner_id: ctx.orgId,
    actor_user_id: ctx.userId,
    source_app_id: '876-couriers',
    ...file,
  })
  if (result.error) return storageErrorResponse(result.error)

  return apiJson({ data: result.data }, { status: 201 })
}
