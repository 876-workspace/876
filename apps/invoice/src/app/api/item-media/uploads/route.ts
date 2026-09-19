import {
  billingItemMediaUploadRequestSchema,
  orchestrateBillingItemMediaUpload,
  type BillingItemMediaTarget,
} from '@876/billing/server'
import { apiJson } from '@876/core/api'

import { getInvoiceContext } from '@/lib/auth/context'
import { getBilling } from '@/lib/clients/billing'
import { createStorageService } from '@/lib/clients/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function authorizeTarget(
  itemId: string,
  variantId?: string | null
): Promise<BillingItemMediaTarget | Response> {
  const context = await getInvoiceContext()
  if (!context)
    return apiJson({ error: 'Invoice authentication is required.' }, { status: 401 })
  if (context.role === 'staff')
    return apiJson({ error: 'Item write access is required.' }, { status: 403 })

  const billing = await getBilling(context.orgId)
  const item = await billing.items.retrieve(itemId)
  if (item.error || !item.data)
    return apiJson({ error: 'Item not found.' }, { status: 404 })

  if (variantId) {
    const variant = await billing.items.retrieveVariant(itemId, variantId)
    if (variant.error || !variant.data)
      return apiJson({ error: 'Item variant not found.' }, { status: 404 })
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
  const parsed = billingItemMediaUploadRequestSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'The image upload request is invalid.' }, { status: 400 })

  const target = await authorizeTarget(parsed.data.itemId, parsed.data.variantId)
  if (target instanceof Response) return target

  const billing = await getBilling(target.organizationId)
  const result = await orchestrateBillingItemMediaUpload(parsed.data, target, {
    sourceAppId: '876-invoice',
    storage: createStorageService(request.headers.get('x-request-id') ?? undefined),
    async attach(fileId) {
      const attached = target.variantId
        ? await billing.items.attachVariantMedia(
            target.itemId,
            target.variantId,
            { fileId }
          )
        : await billing.items.attachMedia(target.itemId, { fileId })
      return attached.error === null
    },
  })

  return result.error
    ? apiJson({ error: result.error }, { status: result.status })
    : apiJson({ data: result.data }, { status: result.status })
}
