import type { StorageServiceClient } from '@876/storage/service'
import { z } from 'zod'

const targetSchema = z.strictObject({ paymentModeId: z.string().min(1) })
const startSchema = targetSchema.extend({
  action: z.literal('start'),
  fileName: z.string().trim().min(1).max(1024),
  contentType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(5 * 1024 * 1024),
})
const completeSchema = targetSchema.extend({
  action: z.literal('complete'),
  sessionId: z.string().min(1),
})

export const billingPaymentModeImageUploadRequestSchema = z.discriminatedUnion(
  'action',
  [startSchema, completeSchema]
)
export type BillingPaymentModeImageUploadRequest = z.infer<
  typeof billingPaymentModeImageUploadRequestSchema
>
export interface BillingPaymentModeImageTarget {
  userId: string
  organizationId: string
  paymentModeId: string
}
export interface BillingPaymentModeImageStoragePort {
  uploads: Pick<StorageServiceClient['uploads'], 'create' | 'complete'>
  resourceLinks: Pick<StorageServiceClient['resourceLinks'], 'create' | 'list'>
}
export interface BillingPaymentModeImageUploadOptions {
  sourceAppId: '876-billing' | '876-invoice' | '876-couriers'
  storage: BillingPaymentModeImageStoragePort
  attach(image: { fileId: string; imageUrl: string }): Promise<boolean>
}
type Result =
  | { data: unknown; error: null; status: 200 | 201 }
  | { data: null; error: string; status: 400 | 409 | 502 }
const fail = (error: string, status: 400 | 409 | 502): Result => ({
  data: null,
  error,
  status,
})

/** Uploads a public, document-facing payment-mode logo without proxying bytes. */
export async function orchestrateBillingPaymentModeImageUpload(
  request: BillingPaymentModeImageUploadRequest,
  target: BillingPaymentModeImageTarget,
  options: BillingPaymentModeImageUploadOptions
): Promise<Result> {
  if (request.action === 'start') {
    const result = await options.storage.uploads.create({
      route_key: 'billing.paymentModeImage',
      owner_type: 'organization',
      owner_id: target.organizationId,
      actor_user_id: target.userId,
      source_app_id: options.sourceAppId,
      file_name: request.fileName,
      content_type: request.contentType,
      size_bytes: request.sizeBytes,
    })
    return result.error || !result.data
      ? fail(result.error?.message ?? 'Failed to start the image upload.', 400)
      : { data: result.data, error: null, status: 201 }
  }
  const completed = await options.storage.uploads.complete(request.sessionId)
  const file = completed.data
  if (completed.error || !file)
    return fail(
      completed.error?.message ?? 'Failed to complete the image upload.',
      400
    )
  if (
    file.status !== 'ready' ||
    file.owner_type !== 'organization' ||
    file.owner_id !== target.organizationId ||
    file.purpose !== 'billing_payment_mode_image' ||
    !file.url
  )
    return fail(
      'The completed Storage file does not match this payment mode image upload.',
      409
    )
  const params = {
    file_id: file.id,
    app_id: '876-billing',
    resource_type: 'payment-mode',
    resource_id: target.paymentModeId,
    relation: 'image',
    owner_type: 'organization' as const,
    owner_id: target.organizationId,
    actor_user_id: target.userId,
  }
  const linked = await options.storage.resourceLinks.create(params)
  if (linked.error || !linked.data)
    return fail('Failed to link the image to the payment mode.', 400)
  if (!(await options.attach({ fileId: file.id, imageUrl: file.url })))
    return fail(
      'The image is ready in Storage but could not be attached to the payment mode. Retry completion.',
      502
    )
  return { data: { file, link: linked.data }, error: null, status: 200 }
}
