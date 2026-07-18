import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { $876 } from '@/lib/876'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string; addressId: string }> }

export async function PATCH(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:users')
  if (response) return response

  const { id, addressId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const { data, error } = await $876.users.updateAddress(id, addressId, body)
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to update address.' },
      { status: 400 }
    )

  return apiJson({ data })
}

export async function DELETE(
  _request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:users')
  if (response) return response

  const { id, addressId } = await context.params
  const { data, error } = await $876.users.deleteAddress(id, addressId)
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to delete address.' },
      { status: 400 }
    )

  return apiJson({ data })
}
