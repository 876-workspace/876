import { describe, expect, it, vi } from 'vitest'

import {
  orchestrateBillingItemMediaUpload,
  type BillingItemMediaStoragePort,
} from './item-media'

const target = {
  userId: 'usr_1',
  organizationId: 'org_1',
  itemId: 'item_1',
  variantId: null,
}

const uploadSession = {
  object: 'upload_session' as const,
  id: 'upl_1',
  file_id: 'file_1',
  upload_url: 'https://uploads.example.test/file_1',
  method: 'PUT' as const,
  headers: {
    'Content-Type': 'image/png',
    'Content-Length': '100',
  },
  expires_at: 1_800_000_000,
}

function file(overrides: Partial<{
  owner_id: string
  purpose: string
}> = {}) {
  return {
    object: 'file' as const,
    id: 'file_1',
    owner_type: 'organization' as const,
    owner_id: overrides.owner_id ?? 'org_1',
    source_app_id: '876-billing',
    purpose: overrides.purpose ?? 'billing_item_image',
    category: 'attachment' as const,
    audience: 'public' as const,
    status: 'ready' as const,
    original_name: 'photo.png',
    content_type: 'image/png',
    size_bytes: 100,
    version_id: 'ver_1',
    url: 'https://cdn.example.test/file_1.png',
    created_at: 1_700_000_000,
    updated_at: 1_700_000_000,
  }
}

const link = {
  object: 'resource_link' as const,
  id: 'rlink_1',
  file_id: 'file_1',
  app_id: '876-billing',
  resource_type: 'item',
  resource_id: 'item_1',
  relation: 'image',
  created_by: 'usr_1',
  created_at: 1_700_000_000,
}

function storagePort(): BillingItemMediaStoragePort {
  return {
    uploads: {
      create: vi.fn().mockResolvedValue({ data: uploadSession, error: null }),
      complete: vi.fn().mockResolvedValue({ data: file(), error: null }),
    },
    resourceLinks: {
      create: vi.fn().mockResolvedValue({ data: link, error: null }),
      list: vi.fn().mockResolvedValue({
        data: { object: 'list', data: [] },
        error: null,
      }),
    },
  }
}

describe('orchestrateBillingItemMediaUpload', () => {
  it('starts an Item image upload with Billing-owned Storage policy', async () => {
    const storage = storagePort()

    const result = await orchestrateBillingItemMediaUpload(
      {
        action: 'start',
        itemId: 'item_1',
        fileName: 'photo.png',
        contentType: 'image/png',
        sizeBytes: 100,
      },
      target,
      { sourceAppId: '876-invoice', storage, attach: vi.fn() }
    )

    expect(result).toEqual({ data: uploadSession, error: null, status: 201 })
    expect(storage.uploads.create).toHaveBeenCalledWith({
      route_key: 'billing.itemImage',
      owner_type: 'organization',
      owner_id: 'org_1',
      actor_user_id: 'usr_1',
      source_app_id: '876-invoice',
      file_name: 'photo.png',
      content_type: 'image/png',
      size_bytes: 100,
    })
  })

  it('rejects a completed file that belongs to another organization', async () => {
    const storage = storagePort()
    vi.mocked(storage.uploads.complete).mockResolvedValue({
      data: file({ owner_id: 'org_other' }),
      error: null,
    })

    const result = await orchestrateBillingItemMediaUpload(
      { action: 'complete', itemId: 'item_1', sessionId: 'upl_1' },
      target,
      { sourceAppId: '876-billing', storage, attach: vi.fn() }
    )

    expect(result).toEqual({
      data: null,
      error: 'The completed Storage file does not match this Item image upload.',
      status: 409,
    })
    expect(storage.resourceLinks.create).not.toHaveBeenCalled()
  })

  it('recovers an existing exact Storage link before retrying Billing attach', async () => {
    const storage = storagePort()
    vi.mocked(storage.resourceLinks.create).mockResolvedValue({
      data: null,
      error: { code: 'storage/resource-link-conflict', message: 'Already linked.' },
    })
    vi.mocked(storage.resourceLinks.list).mockResolvedValue({
      data: { object: 'list', data: [link] },
      error: null,
    })
    const attach = vi.fn().mockResolvedValue(true)

    const result = await orchestrateBillingItemMediaUpload(
      { action: 'complete', itemId: 'item_1', sessionId: 'upl_1' },
      target,
      { sourceAppId: '876-billing', storage, attach }
    )

    expect(result).toEqual({
      data: { file: file(), link },
      error: null,
      status: 200,
    })
    expect(attach).toHaveBeenCalledWith('file_1')
  })

  it('returns a retryable gateway failure when Billing attachment fails', async () => {
    const storage = storagePort()

    const result = await orchestrateBillingItemMediaUpload(
      { action: 'complete', itemId: 'item_1', sessionId: 'upl_1' },
      target,
      {
        sourceAppId: '876-billing',
        storage,
        attach: vi.fn().mockResolvedValue(false),
      }
    )

    expect(result).toEqual({
      data: null,
      error:
        'The image is ready in Storage but could not be attached to the Item. Retry completion.',
      status: 502,
    })
  })

  it('uses the Variant route and purpose for Variant media', async () => {
    const storage = storagePort()
    vi.mocked(storage.uploads.complete).mockResolvedValue({
      data: file({ purpose: 'billing_item_variant_image' }),
      error: null,
    })
    const variantLink = {
      ...link,
      resource_type: 'item-variant',
      resource_id: 'ivar_1',
    }
    vi.mocked(storage.resourceLinks.create).mockResolvedValue({
      data: variantLink,
      error: null,
    })

    const result = await orchestrateBillingItemMediaUpload(
      {
        action: 'complete',
        itemId: 'item_1',
        variantId: 'ivar_1',
        sessionId: 'upl_1',
      },
      { ...target, variantId: 'ivar_1' },
      {
        sourceAppId: '876-billing',
        storage,
        attach: vi.fn().mockResolvedValue(true),
      }
    )

    expect(result.error).toBeNull()
    expect(storage.resourceLinks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        app_id: '876-billing',
        resource_type: 'item-variant',
        resource_id: 'ivar_1',
        relation: 'image',
      })
    )
  })
})
