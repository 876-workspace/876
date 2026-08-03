import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Context = { params: Promise<{ userId: string }> }

/** Detaches a user avatar before soft-deleting its Storage file. */
export async function DELETE(_request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:users')
  if (response) return response

  const { userId } = await context.params
  const retrieveResult = await $876.users.retrieve(userId)
  if (retrieveResult.error || !retrieveResult.data)
    return apiJson(
      { error: retrieveResult.error ?? 'Failed to retrieve the user.' },
      { status: 400 }
    )

  const fileId = retrieveResult.data.avatar_file_id
  if (!fileId && !retrieveResult.data.avatar)
    return apiJson(
      { error: 'The user has no image to remove.' },
      { status: 409 }
    )

  const updateResult = await $876.users.update(userId, {
    avatar_file_id: null,
    avatar: null,
  })
  if (updateResult.error || !updateResult.data)
    return apiJson(
      { error: updateResult.error ?? 'Failed to clear the user image.' },
      { status: 400 }
    )

  // An avatar predating 876 Storage has a URL but no file to delete.
  if (!fileId) return apiJson({ data: null })

  const deleteResult = await $876.storage.files.delete(fileId)
  if (deleteResult.error || !deleteResult.data)
    return apiJson(
      { error: deleteResult.error ?? 'Failed to delete the image file.' },
      { status: 400 }
    )

  return apiJson({ data: deleteResult.data })
}
