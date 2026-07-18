import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { $876 } from '@/lib/876'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

export async function GET(
  _request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:users')
  if (response) return response

  const { id } = await context.params
  const { data } = await $876.users.retrieveProfile(id)
  // Profile is optional; a missing profile is not an error for the overview.
  return apiJson({ data: data ?? null })
}

export async function POST(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:users')
  if (response) return response

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const { data, error } = await $876.users.createProfile(id, body)
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to create profile.' },
      { status: 400 }
    )

  return apiJson({ data })
}

export async function PATCH(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:users')
  if (response) return response

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const { data, error } = await $876.users.updateProfile(id, body)
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to update profile.' },
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

  const { id } = await context.params
  const { data, error } = await $876.users.deleteProfile(id)
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to delete profile.' },
      { status: 400 }
    )

  return apiJson({ data })
}
