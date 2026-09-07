import type { StorageServiceClient } from '@876/storage/service'
import { z } from 'zod'

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

export const billingItemMediaUploadRequestSchema = z.discriminatedUnion('action', [
  startSchema,
  completeSchema,
])

export type BillingItemMediaUploadRequest = z.infer<
  typeof billingItemMediaUploadRequestSchema
>

export interface BillingItemMediaTarget {
  userId: string
  organizationId: string
  itemId: string
  variantId: string | null
}

export interface BillingItemMediaStoragePort {
  uploads: Pick<StorageServiceClient['uploads'], 'create' | 'complete'>
  resourceLinks: Pick<StorageServiceClient['resourceLinks'], 'create' | 'list'>
}

export interface BillingItemMediaUploadOptions {
  sourceAppId: '876-billing' | '876-invoice'
  storage: BillingItemMediaStoragePort
  attach(fileId: string): Promise<boolean>
}

type OrchestrationResult =
  | { data: unknown; error: null; status: 200 | 201 }
  | { data: null; error: string; status: 400 | 409 | 502 }

function failure(
  error: string,
  status: 400 | 409 | 502
): OrchestrationResult {
  return { data: null, error, status }
}

function resourceIdentity(target: BillingItemMediaTarget) {
  const variant = target.variantId !== null
  return {
    variant,
    routeKey: variant ? 'billing.itemVariantImage' : 'billing.itemImage',
    purpose: variant ? 'billing_item_variant_image' : 'billing_item_image',
    resourceType: variant ? 'item-variant' : 'item',
    resourceId: target.variantId ?? target.itemId,
  } as const
}

async function ensureImageLink(
  storage: BillingItemMediaStoragePort,
  target: BillingItemMediaTarget,
  fileId: string
) {
  const resource = resourceIdentity(target)
  const params = {
    file_id: fileId,
    app_id: '876-billing',
    resource_type: resource.resourceType,
    resource_id: resource.resourceId,
    relation: 'image',
    owner_type: 'organization' as const,
    owner_id: target.organizationId,
    actor_user_id: target.userId,
  }
  const created = await storage.resourceLinks.create(params)
  if (!created.error && created.data) return created.data

  // Completion is retryable. If a prior attempt created the exact Storage link
  // but failed while attaching Billing metadata, recover that link and continue.
  const listed = await storage.resourceLinks.list({
    app_id: params.app_id,
    resource_type: params.resource_type,
    resource_id: params.resource_id,
    relation: params.relation,
  })
  if (!listed.error && listed.data) {
    const existing = listed.data.data.find((link) => link.file_id === fileId)
    if (existing) return existing
  }

  return null
}

/**
 * Owns Billing's Storage policy for Item/Variant images while hosts retain auth
 * and inject the final Billing attachment call. Browser bytes never pass here.
 */
export async function orchestrateBillingItemMediaUpload(
  request: BillingItemMediaUploadRequest,
  target: BillingItemMediaTarget,
  options: BillingItemMediaUploadOptions
): Promise<OrchestrationResult> {
  const resource = resourceIdentity(target)

  if (request.action === 'start') {
    const result = await options.storage.uploads.create({
      route_key: resource.routeKey,
      owner_type: 'organization',
      owner_id: target.organizationId,
      actor_user_id: target.userId,
      source_app_id: options.sourceAppId,
      file_name: request.fileName,
      content_type: request.contentType,
      size_bytes: request.sizeBytes,
    })
    if (result.error || !result.data)
      return failure(
        result.error?.message ?? 'Failed to start the image upload.',
        400
      )

    return { data: result.data, error: null, status: 201 }
  }

  const completed = await options.storage.uploads.complete(request.sessionId)
  if (completed.error || !completed.data)
    return failure(
      completed.error?.message ?? 'Failed to complete the image upload.',
      400
    )

  const file = completed.data
  if (
    file.status !== 'ready' ||
    file.owner_type !== 'organization' ||
    file.owner_id !== target.organizationId ||
    file.purpose !== resource.purpose
  )
    return failure(
      'The completed Storage file does not match this Item image upload.',
      409
    )

  const link = await ensureImageLink(options.storage, target, file.id)
  if (!link) return failure('Failed to link the image to the Item.', 400)

  if (!(await options.attach(file.id)))
    return failure(
      'The image is ready in Storage but could not be attached to the Item. Retry completion.',
      502
    )

  return { data: { file, link }, error: null, status: 200 }
}
