import { apiJson } from '@876/core/api'

import { platform } from '@/lib/clients/platform'
import { requireConsolePermission } from '@/lib/auth/route-guard'

type Context = { params: Promise<{ id: string }> }

type Body = {
  label?: string | null
  trusted?: boolean
  blocked?: boolean
  blockReason?: string | null
}

export async function POST(
  request: Request,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:users')
  if (response) return response

  const { id } = await context.params
  const body = (await request.json()) as Body

  const result = await platform.devices.update(id, {
    label: body.label,
    trusted: body.trusted,
    blocked: body.blocked,
    blockReason: body.blockReason,
  })

  return result.error
    ? apiJson({ error: result.error.message }, { status: 400 })
    : apiJson({ data: result.data })
}
