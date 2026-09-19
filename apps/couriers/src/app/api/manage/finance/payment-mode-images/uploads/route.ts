import 'server-only'

import {
  billingPaymentModeImageUploadRequestSchema,
  orchestrateBillingPaymentModeImageUpload,
} from '@876/billing/server'
import { toAppError } from '@876/core'
import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { getError } from '@/lib/errors'

import { storage } from '@/lib/clients/storage'
import { createBillingIntegration } from '@/lib/clients/billing'

import { invalidRequest, requireFinanceAccess } from '../../_lib/access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const orgSlugSchema = z
  .object({ orgSlug: z.string().trim().min(1) })
  .passthrough()

/** Opens or completes a direct Storage upload for one authorized payment-mode logo. */
export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => null)
  const organization = orgSlugSchema.safeParse(rawBody)
  if (!organization.success)
    return invalidRequest('finance/invalid-payment-mode')
  const { orgSlug: _orgSlug, ...upload } = organization.data
  const body = billingPaymentModeImageUploadRequestSchema.safeParse(upload)
  if (!body.success) return invalidRequest('finance/invalid-payment-mode')
  const access = await requireFinanceAccess(organization.data.orgSlug)
  if (access.response) return access.response
  if (!access.context) return invalidRequest('finance/invalid-payment-mode')
  const financeContext = access.context
  const billing = createBillingIntegration()
  const mode = await billing.paymentModes.retrieve(
    financeContext.orgId,
    body.data.paymentModeId
  )
  if (mode.error || !mode.data)
    return errorResponse('finance/payment-mode-not-found')
  const result = await orchestrateBillingPaymentModeImageUpload(
    body.data,
    {
      userId: financeContext.userId,
      organizationId: financeContext.orgId,
      paymentModeId: mode.data.id,
    },
    {
      sourceAppId: '876-couriers',
      storage,
      async attach(image) {
        const updated = await billing.paymentModes.update(
          financeContext.orgId,
          mode.data.id,
          {
            imageFileId: image.fileId,
            imageUrl: image.imageUrl,
          }
        )
        return updated.error === null
      },
    }
  )
  if (result.error) return errorResponse(UPLOAD_FAILURE_CODES[result.status])

  return apiJson({ data: result.data, error: null }, { status: result.status })
}

const UPLOAD_FAILURE_CODES = {
  400: 'finance/payment-mode-image-upload-failed',
  409: 'finance/payment-mode-image-mismatch',
  502: 'finance/payment-mode-image-attach-failed',
} as const

function errorResponse(code: string): Response {
  const error = getError(code)
  return apiJson(
    { data: null, error: toAppError(error) },
    { status: error.httpStatus }
  )
}
