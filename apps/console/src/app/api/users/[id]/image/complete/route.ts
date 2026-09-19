import { storage } from '@/lib/clients/storage'
import { platform } from '@/lib/clients/platform'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { imageUploadCompleteSchema } from '@/types/storage'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

/** Verifies a user-avatar upload and attaches the ready file. */
export async function POST(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:users')
  if (response) return response

  const body = await request.json().catch(() => null)
  const parsed = imageUploadCompleteSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'The upload request is invalid.' }, { status: 400 })

  const { id: userId } = await context.params
  const result = await storage.uploads.complete(parsed.data.id)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error ?? 'Failed to verify the image upload.' },
      { status: 400 }
    )

  const file = result.data
  if (file.owner_type !== 'user' || file.owner_id !== userId)
    return apiJson(
      { error: 'This file does not belong to the selected user.' },
      { status: 400, code: 'storage/invalid-owner' }
    )
  if (file.status !== 'ready' || !file.url)
    return apiJson(
      { error: 'The uploaded file could not be verified. Please try again.' },
      { status: 400, code: 'storage/upload-verification-failed' }
    )

  const updateResult = await platform.users.update(userId, {
    avatar_file_id: file.id,
    avatar: file.url,
  })
  if (updateResult.error || !updateResult.data)
    return apiJson(
      { error: updateResult.error ?? 'Failed to update the user image.' },
      { status: 400 }
    )

  return apiJson({ data: file })
}
