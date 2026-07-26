import 'server-only'

import { apiJson } from '@876/core/api'
import type { AppError } from '@876/core'
import type { NextRequest } from 'next/server'

import { getManageContext } from '@/lib/auth/manage-context'
import { getError } from '@/lib/errors'
import { getFeatures } from '@/lib/features'
import { $storage } from '@/lib/storage'
import { organizationLogoUploadStartSchema } from '@/types/storage'

export const runtime = 'nodejs'

function storageErrorResponse(error: AppError) {
  const definition = getError(error.code)

  return apiJson({ error }, { status: definition.httpStatus, code: error.code })
}

/** Opens a signed organization-logo upload after authorizing this org actor. */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return storageErrorResponse({
      code: 'storage/invalid-request',
      message: 'The upload request is invalid.',
    })
  }

  const parsed = organizationLogoUploadStartSchema.safeParse(body)
  if (!parsed.success)
    return storageErrorResponse({
      code: 'storage/invalid-request',
      message: 'The upload request is invalid.',
    })

  const { orgSlug, ...file } = parsed.data

  const ctx = await getManageContext(orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      {
        error: 'You do not have permission to edit the organization profile.',
      },
      { status: 403, code: 'auth/forbidden' }
    )

  const features = await getFeatures({
    userId: ctx.userId,
    organizationId: ctx.orgId,
  })
  if (!features.storageOrgLogoUpload)
    return storageErrorResponse({
      code: 'storage/forbidden',
      message: 'Organization logo uploads are not enabled.',
    })

  const result = await $storage.uploads.create({
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
