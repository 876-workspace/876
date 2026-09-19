import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { getPlatformClient } from '@/lib/clients/platform'
import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { getAppError, getError } from '@/lib/errors'
import { storage } from '@/lib/clients/storage'
import { organizationLogoUploadCompleteSchema } from '@/types/storage'

export const runtime = 'nodejs'

function storageErrorResponse(error: { code: string }) {
  const definition = getError(error.code)

  return apiJson(
    { data: null, error: getAppError(error.code) },
    { status: definition.httpStatus }
  )
}

/** Verifies an organization-logo upload, then atomically replaces its profile reference. */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return storageErrorResponse({
      code: 'storage/invalid-request',
    })
  }

  const parsed = organizationLogoUploadCompleteSchema.safeParse(body)
  if (!parsed.success)
    return storageErrorResponse({
      code: 'storage/invalid-request',
    })

  const ctx = await getManageContext(parsed.data.orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')

  const result = await storage.uploads.complete(parsed.data.id)
  if (result.error) return storageErrorResponse(result.error)

  const file = result.data
  if (file.owner_type !== 'organization' || file.owner_id !== ctx.orgId)
    return storageErrorResponse({
      code: 'storage/invalid-owner',
    })
  if (file.status !== 'ready' || !file.url)
    return storageErrorResponse({
      code: 'storage/upload-verification-failed',
    })

  const platform = await getPlatformClient()
  const profileResult = await platform.organizations.updateProfile(ctx.orgId, {
    logo_file_id: file.id,
    logo_url: file.url,
  })
  if (profileResult.error) return errorResponse(profileResult.error.code)

  return apiJson({ data: file })
}
