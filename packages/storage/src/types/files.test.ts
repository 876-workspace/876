import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fileSchema } from './files'

function createFilePayload(overrides: Record<string, unknown> = {}) {
  return {
    object: 'file',
    id: 'file_01J8XYZ',
    owner_type: 'organization',
    owner_id: 'org_123',
    source_app_id: '876-couriers',
    purpose: 'organization_logo',
    category: 'attachment',
    audience: 'public',
    status: 'ready',
    original_name: 'logo.png',
    content_type: 'image/png',
    size_bytes: 84_213,
    version_id: 'ver_01J8XYA',
    url: 'https://assets.876.app/logo.png',
    created_at: 1_753_487_000,
    updated_at: 1_753_487_100,
    ...overrides,
  }
}

describe('fileSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects an audience outside the contract union', () => {
    // ARRANGE
    const payload = createFilePayload({ audience: 'friends' })

    // ACT
    const result = fileSchema.safeParse(payload)

    // ASSERT
    expect(result.success).toBe(false)

    // AFTER — no teardown needed
  })

  it('rejects the retired visibility field even when its value looks plausible', () => {
    // ARRANGE
    const payload = createFilePayload({ visibility: 'organization' })

    // ACT
    const result = fileSchema.safeParse(payload)

    // ASSERT
    expect(result.success).toBe(false)

    // AFTER — no teardown needed
  })

  it('rejects the forbidden delivery field', () => {
    // ARRANGE
    const payload = createFilePayload({ delivery: 'public' })

    // ACT
    const result = fileSchema.safeParse(payload)

    // ASSERT
    expect(result.success).toBe(false)

    // AFTER — no teardown needed
  })

  it('rejects a stable URL on a non-public file', () => {
    // ARRANGE
    const payload = createFilePayload({ audience: 'organization' })

    // ACT
    const result = fileSchema.safeParse(payload)

    // ASSERT
    expect(result.success).toBe(false)

    // AFTER — no teardown needed
  })

  it('rejects a ready public file without its stable URL', () => {
    // ARRANGE
    const payload = createFilePayload({ url: null })

    // ACT
    const result = fileSchema.safeParse(payload)

    // ASSERT
    expect(result.success).toBe(false)

    // AFTER — no teardown needed
  })

  it('accepts a non-public file without a stable URL', () => {
    // ARRANGE
    const payload = createFilePayload({
      audience: 'organization',
      url: null,
    })

    // ACT
    const result = fileSchema.safeParse(payload)

    // ASSERT
    expect(result).toEqual({
      success: true,
      data: payload,
    })

    // AFTER — no teardown needed
  })
})
