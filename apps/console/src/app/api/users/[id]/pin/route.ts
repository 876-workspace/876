import { platform } from '@/lib/clients/platform'
import { apiJson } from '@876/core/api'

import { requireConsolePermission } from '@/lib/auth/route-guard'

type Context = { params: Promise<{ id: string }> }

export async function POST(
  request: Request,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:users')
  if (response) return response
  const { id } = await context.params
  const body = await request.json()
  const result = await platform.users.pin.set(id, { pin: body.pin })
  return result.error
    ? apiJson({ error: result.error.message }, { status: 400 })
    : apiJson({ data: result.data })
}

export async function DELETE(
  _request: Request,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:users')
  if (response) return response
  const { id } = await context.params
  const result = await platform.users.pin.delete(id)
  return result.error
    ? apiJson({ error: result.error.message }, { status: 400 })
    : apiJson({ data: result.data })
}
