import {
  billingPaymentModeImageUploadRequestSchema,
  orchestrateBillingPaymentModeImageUpload,
} from '@876/billing/server'
import { apiJson } from '@876/core/api'

import { getWorkspaceContext, hasPermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { billingApiRequest } from '@/lib/service/api'
import { createStorageService } from '@/lib/services/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = billingPaymentModeImageUploadRequestSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!body.success)
    return apiJson(
      { error: 'The image upload request is invalid.' },
      { status: 400 }
    )
  const context = await getWorkspaceContext()
  if (!context)
    return apiJson(
      { error: 'Billing authentication is required.' },
      { status: 401 }
    )
  if (!hasPermission(context, 'payments:write'))
    return apiJson(
      { error: 'Payment mode write access is required.' },
      { status: 403 }
    )
  const mode = await service.paymentModes.retrieve(
    context.tenant.id,
    body.data.paymentModeId
  )
  if (!mode)
    return apiJson({ error: 'Payment mode not found.' }, { status: 404 })
  const result = await orchestrateBillingPaymentModeImageUpload(
    body.data,
    {
      userId: context.userId,
      organizationId: context.orgId,
      paymentModeId: mode.id,
    },
    {
      sourceAppId: '876-billing',
      storage: createStorageService(
        request.headers.get('x-request-id') ?? undefined
      ),
      async attach(image) {
        try {
          await billingApiRequest({
            method: 'PATCH',
            path: `/api/v1/payments/modes/${encodeURIComponent(mode.id)}`,
            body: { imageFileId: image.fileId, imageUrl: image.imageUrl },
          })
          return true
        } catch {
          return false
        }
      },
    }
  )
  return result.error
    ? apiJson({ error: result.error }, { status: result.status })
    : apiJson({ data: result.data }, { status: result.status })
}
