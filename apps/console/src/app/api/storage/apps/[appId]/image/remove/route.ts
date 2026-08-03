import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Context = { params: Promise<{ appId: string }> }

/** Detaches an app logo before soft-deleting its Storage file. */
export async function DELETE(_request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { appId } = await context.params
  const retrieveResult = await $876.apps.retrieve(appId)
  if (retrieveResult.error || !retrieveResult.data)
    return apiJson(
      { error: retrieveResult.error ?? 'Failed to retrieve the app.' },
      { status: 400 }
    )

  const fileId = retrieveResult.data.logo_file_id
  if (!fileId)
    return apiJson(
      { error: 'The app has no image to remove.' },
      { status: 409 }
    )

  const updateResult = await $876.apps.update(appId, {
    logo_file_id: null,
    logo_url: null,
  })
  if (updateResult.error || !updateResult.data)
    return apiJson(
      { error: updateResult.error ?? 'Failed to clear the app image.' },
      { status: 400 }
    )

  const deleteResult = await $876.storage.files.delete(fileId)
  if (deleteResult.error || !deleteResult.data)
    return apiJson(
      { error: deleteResult.error ?? 'Failed to delete the image file.' },
      { status: 400 }
    )

  return apiJson({ data: deleteResult.data })
}
