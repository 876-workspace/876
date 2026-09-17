import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import type { z } from 'zod'

import { requireApiPermission } from '@/lib/auth/api-permission'
import type { ApiContext } from '@/types/access'

type Context = { params: Promise<{ id: string }> }
type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: { message: string } }

export async function createWorkStructureResource<TInput, TOutput>(
  request: NextRequest,
  schema: z.ZodType<TInput>,
  create: (orgId: string, input: TInput) => Promise<ServiceResult<TOutput>>,
  invalidMessage: string
) {
  const auth: ApiContext = await requireApiPermission('settings.edit')
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: invalidMessage }, { status: 422 })

  const result = await create(auth.orgId, parsed.data)
  if (result.error)
    return apiJson({ error: result.error.message }, { status: 400 })

  return apiJson({ data: result.data }, { status: 201 })
}

export async function updateWorkStructureResource<TInput, TOutput>(
  request: NextRequest,
  { params }: Context,
  schema: z.ZodType<TInput>,
  update: (
    orgId: string,
    id: string,
    input: TInput
  ) => Promise<ServiceResult<TOutput>>,
  invalidMessage: string
) {
  const auth: ApiContext = await requireApiPermission('settings.edit')
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: invalidMessage }, { status: 422 })

  const { id } = await params
  const result = await update(auth.orgId, id, parsed.data)
  if (result.error)
    return apiJson({ error: result.error.message }, { status: 400 })

  return apiJson({ data: result.data })
}

export async function deleteWorkStructureResource<TOutput>(
  { params }: Context,
  remove: (orgId: string, id: string) => Promise<ServiceResult<TOutput>>
) {
  const auth: ApiContext = await requireApiPermission('settings.edit')
  if (auth.response) return auth.response

  const { id } = await params
  const result = await remove(auth.orgId, id)
  if (result.error)
    return apiJson({ error: result.error.message }, { status: 400 })

  return apiJson({ data: result.data })
}
