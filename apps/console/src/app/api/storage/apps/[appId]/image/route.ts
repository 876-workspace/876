import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'
import { imageUploadStartSchema } from '@/types/storage'

export const runtime = 'nodejs'

type Context = { params: Promise<{ appId: string }> }

/** Opens a signed app-logo upload after authorizing the Console actor. */
export async function POST(request: NextRequest, context: Context) {
  const { caller, response } = await requireConsolePermission('console:apps')
  if (response) return response

  const body = await request.json().catch(() => null)
  const parsed = imageUploadStartSchema.safeParse(body)
  if (!parsed.success || parsed.data.route_key !== 'app.logo')
    return apiJson({ error: 'The upload request is invalid.' }, { status: 400 })

  const { appId } = await context.params
  const { route_key, ...file } = parsed.data
  const result = await $876.storage.uploads.create({
    route_key,
    owner_type: 'platform',
    owner_id: appId,
    actor_user_id: caller.id,
    source_app_id: '876-console',
    ...file,
  })
  if (result.error || !result.data)
    return apiJson(
      { error: result.error ?? 'Failed to start the image upload.' },
      { status: 400 }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
