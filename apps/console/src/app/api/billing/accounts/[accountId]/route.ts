import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Context = { params: Promise<{ accountId: string }> }

export async function PATCH(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { accountId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const { data, error } = await $876.billingAccounts.update(accountId, body)
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to update billing account.' },
      { status: 400 }
    )

  return apiJson({ data })
}

export async function DELETE(
  _request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { accountId } = await context.params
  const { data, error } = await $876.billingAccounts.del(accountId)
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to delete billing account.' },
      { status: 400 }
    )

  return apiJson({ data })
}
