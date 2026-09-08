import {
  billingItemMediaUploadRequestSchema,
  orchestrateBillingItemMediaUpload,
  type BillingItemMediaTarget,
} from '@876/billing/server'
import { apiJson } from '@876/core/api'

import {
  getWorkspaceContext,
  hasPermission,
} from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { billingApiRequest } from '@/lib/service/api'
import { createStorageService } from '@/lib/services/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function authorizeTarget(
  itemId: string,
  variantId?: string | null
): Promise<BillingItemMediaTarget | Response> {
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

function mediaPath(target: BillingItemMediaTarget) {
  const base = `/api/v1/items/${encodeURIComponent(target.itemId)}`
  return target.variantId
    ? `${base}/variants/${encodeURIComponent(target.variantId)}/media`
    : `${base}/media`
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = billingItemMediaUploadRequestSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'The image upload request is invalid.' }, { status: 400 })

  const target = await authorizeTarget(parsed.data.itemId, parsed.data.variantId)
  if (target instanceof Response) return target

  const result = await orchestrateBillingItemMediaUpload(parsed.data, target, {
    sourceAppId: '876-billing',
    storage: createStorageService(request.headers.get('x-request-id') ?? undefined),
    async attach(fileId) {
      try {
        await billingApiRequest({
          method: 'POST',
          path: mediaPath(target),
          body: { fileId },
        })
        return true
      } catch {
        return false
      }
    },
  })

  return result.error
    ? apiJson({ error: result.error }, { status: result.status })
    : apiJson({ data: result.data }, { status: result.status })
}
