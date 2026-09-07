import { apiJson } from '@876/core/api'
import { z } from 'zod'

import {
  getWorkspaceContext,
  hasPermission,
} from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { billingApiRequest } from '@/lib/service/api'
import { createStorageService } from '@/lib/services/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const targetSchema = z.strictObject({
  itemId: z.string().min(1),
  variantId: z.string().min(1).nullable().optional(),
})

const startSchema = targetSchema.extend({
  action: z.literal('start'),
  fileName: z.string().trim().min(1).max(1024),
  contentType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  sizeBytes: z.number().int().positive().max(5 * 1024 * 1024),
})

const completeSchema = targetSchema.extend({
  action: z.literal('complete'),
  sessionId: z.string().min(1),
})

const bodySchema = z.discriminatedUnion('action', [startSchema, completeSchema])

type AuthorizedTarget = {
  userId: string
  organizationId: string
  itemId: string
  variantId: string | null
}

async function authorizeTarget(
  itemId: string,
  variantId?: string | null
): Promise<AuthorizedTarget | Response> {
  const context = await getWorkspaceContext()
  if (!context)
    return apiJson({ error: 'Billing authentication is required.' }, { status: 401 })
  if (!hasPermission(context, 'catalog:write'))
    return apiJson({ error: 'Catalog write access is required.' }, { status: 403 })

  const item = await service.items.retrieve(context.tenant.id, itemId)
  if (!item)
    return apiJson({ error: 'Item not found.' }, { status: 404 })

  if (variantId) {
    try {
      await billingApiRequest({
        path: `/api/v1/items/${encodeURIComponent(itemId)}/variants/${encodeURIComponent(variantId)}`,
      })
    } catch {
      return apiJson({ error: 'Item variant not found.' }, { status: 404 })
    }
  }

  return {
    userId: context.userId,
    organizationId: context.orgId,
    itemId,
    variantId: variantId ?? null,
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'The image upload request is invalid.' }, { status: 400 })

  const target = await authorizeTarget(parsed.data.itemId, parsed.data.variantId)
  if (target instanceof Response) return target

  const storage = createStorageService(request.headers.get('x-request-id') ?? undefined)
  const isVariant = target.variantId !== null

  if (parsed.data.action === 'start') {
    const result = await storage.uploads.create({
      route_key: isVariant ? 'billing.itemVariantImage' : 'billing.itemImage',
      owner_type: 'organization',
      owner_id: target.organizationId,
      actor_user_id: target.userId,
      source_app_id: '876-billing',
      file_name: parsed.data.fileName,
      content_type: parsed.data.contentType,
      size_bytes: parsed.data.sizeBytes,
    })
    if (result.error || !result.data)
      return apiJson(
        { error: result.error?.message ?? 'Failed to start the image upload.' },
        { status: 400 }
      )

    return apiJson({ data: result.data }, { status: 201 })
  }

  const completed = await storage.uploads.complete(parsed.data.sessionId)
  if (completed.error || !completed.data)
    return apiJson(
      { error: completed.error?.message ?? 'Failed to complete the image upload.' },
      { status: 400 }
    )

  const file = completed.data
  const expectedPurpose = isVariant
    ? 'billing_item_variant_image'
    : 'billing_item_image'
  if (
    file.status !== 'ready' ||
    file.owner_type !== 'organization' ||
    file.owner_id !== target.organizationId ||
    file.purpose !== expectedPurpose
  )
    return apiJson(
      { error: 'The completed Storage file does not match this Item image upload.' },
      { status: 409 }
    )

  const link = await storage.resourceLinks.create({
    file_id: file.id,
    app_id: '876-billing',
    resource_type: isVariant ? 'item-variant' : 'item',
    resource_id: target.variantId ?? target.itemId,
    relation: 'image',
    owner_type: 'organization',
    owner_id: target.organizationId,
    actor_user_id: target.userId,
  })
  if (link.error || !link.data)
    return apiJson(
      { error: link.error?.message ?? 'Failed to link the image to the Item.' },
      { status: 400 }
    )

  return apiJson({ data: { file, link: link.data } })
}
