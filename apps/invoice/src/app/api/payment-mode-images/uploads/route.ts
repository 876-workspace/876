import {
  billingPaymentModeImageUploadRequestSchema,
  orchestrateBillingPaymentModeImageUpload,
} from '@876/billing/server'
import { apiJson } from '@876/core/api'

import { getInvoiceContext } from '@/lib/auth/context'
import { getBilling } from '@/lib/clients/billing'
import { createStorageService } from '@/lib/clients/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const bodySchema = billingPaymentModeImageUploadRequestSchema

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json().catch(() => null))
  if (!body.success)
    return apiJson(
      { error: 'The image upload request is invalid.' },
      { status: 400 }
    )
  const context = await getInvoiceContext()
  if (!context)
    return apiJson(
      { error: 'Invoice authentication is required.' },
      { status: 401 }
    )
  if (context.role === 'staff')
    return apiJson(
      { error: 'Payment mode write access is required.' },
      { status: 403 }
    )
  const billing = await getBilling(context.orgId)
  const mode = await billing.paymentModes.retrieve(body.data.paymentModeId)
  if (mode.error || !mode.data)
    return apiJson({ error: 'Payment mode not found.' }, { status: 404 })
  const result = await orchestrateBillingPaymentModeImageUpload(
    body.data,
    {
      userId: context.userId,
      organizationId: context.orgId,
      paymentModeId: mode.data.id,
    },
    {
      sourceAppId: '876-invoice',
      storage: createStorageService(
        request.headers.get('x-request-id') ?? undefined
      ),
      async attach(image) {
        const updated = await billing.paymentModes.update(mode.data.id, {
          imageFileId: image.fileId,
          imageUrl: image.imageUrl,
        })
        return updated.error === null
      },
    }
  )
  return result.error
    ? apiJson({ error: result.error }, { status: result.status })
    : apiJson({ data: result.data }, { status: result.status })
}
