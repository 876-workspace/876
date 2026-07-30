import 'server-only'

import { apiJson } from '@876/core/api'
import type { AppError } from '@876/core'
import type { NextRequest } from 'next/server'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getManageContext } from '@/lib/auth/manage-context'
import { getError } from '@/lib/errors'
import { $876 } from '@/lib/876'
import { organizationLogoUploadCompleteSchema } from '@/types/storage'

export const runtime = 'nodejs'

function storageErrorResponse(error: AppError) {
  const definition = getError(error.code)

  return apiJson({ error }, { status: definition.httpStatus, code: error.code })
}

/** Verifies an organization-logo upload, then atomically replaces its profile reference. */
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

  const parsed = organizationLogoUploadCompleteSchema.safeParse(body)
  if (!parsed.success)
    return storageErrorResponse({
      code: 'storage/invalid-request',
      message: 'The upload request is invalid.',
    })

  const ctx = await getManageContext(parsed.data.orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      {
        error: 'You do not have permission to edit the organization profile.',
      },
      { status: 403, code: 'auth/forbidden' }
    )

  const result = await $876.storage.uploads.complete(parsed.data.id)
  if (result.error) return storageErrorResponse(result.error)

  const file = result.data
  if (file.owner_type !== 'organization' || file.owner_id !== ctx.orgId)
    return storageErrorResponse({
      code: 'storage/invalid-owner',
      message: 'This file does not belong to the selected organization.',
    })
  if (file.status !== 'ready' || !file.url)
    return storageErrorResponse({
      code: 'storage/upload-verification-failed',
      message: 'The uploaded file could not be verified. Please try again.',
    })

  const platform = await getPlatformClient()
  const profileResult = await platform.organizations.updateProfile(ctx.orgId, {
    logo_file_id: file.id,
    logo_url: file.url,
  })
  if (profileResult.error)
    return apiJson(
      { error: profileResult.error },
      { status: 502, code: profileResult.error.code }
    )

  return apiJson({ data: file })
}
