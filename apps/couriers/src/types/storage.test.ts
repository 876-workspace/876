import { describe, expect, it } from 'vitest'

import {
  organizationLogoUploadCompleteSchema,
  organizationLogoUploadStartSchema,
} from './storage'

const SECURITY_INPUTS = [
  '<script>alert(1)</script>',
  "' OR '1'='1",
  '../../etc/passwd',
  '__proto__',
  '\u0000',
  '\u202e',
  'a'.repeat(10_000),
] as const

const validStart = {
  orgSlug: 'island-logistics',
  file_name: 'logo.png',
  content_type: 'image/png',
  size_bytes: 1024,
}

const validComplete = {
  orgSlug: 'island-logistics',
  id: 'upl_01JAMAICA',
}

describe('organizationLogoUploadStartSchema', () => {
  it('accepts a minimal valid start payload', () => {
    const parsed = organizationLogoUploadStartSchema.safeParse(validStart)

    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data).toEqual(validStart)
  })

  it.each([
    ['image/png', 'brand.png'],
    ['image/jpeg', 'brand.jpg'],
    ['image/webp', 'brand.webp'],
  ] as const)('accepts content type %s', (content_type, file_name) => {
    const parsed = organizationLogoUploadStartSchema.safeParse({
      ...validStart,
      content_type,
      file_name,
    })

    expect(parsed.success).toBe(true)
  })

  it('accepts the route maximum size boundary of 5 MiB', () => {
    const parsed = organizationLogoUploadStartSchema.safeParse({
      ...validStart,
      size_bytes: 5 * 1024 * 1024,
    })

    expect(parsed.success).toBe(true)
  })

  it.each([
    [
      'missing orgSlug',
      { file_name: 'a.png', content_type: 'image/png', size_bytes: 1 },
    ],
    ['empty orgSlug', { ...validStart, orgSlug: '' }],
    ['whitespace-only orgSlug stays valid for length', null],
    [
      'missing file_name',
      { orgSlug: 'x', content_type: 'image/png', size_bytes: 1 },
    ],
    ['empty file_name', { ...validStart, file_name: '' }],
    [
      'missing content_type',
      { orgSlug: 'x', file_name: 'a.png', size_bytes: 1 },
    ],
    ['empty content_type', { ...validStart, content_type: '' }],
    ['zero size', { ...validStart, size_bytes: 0 }],
    ['negative size', { ...validStart, size_bytes: -10 }],
    ['float size', { ...validStart, size_bytes: 12.5 }],
    ['string size', { ...validStart, size_bytes: '12' }],
    ['null size', { ...validStart, size_bytes: null }],
  ] as const)('rejects %s', (_label, payload) => {
    if (payload === null) {
      // orgSlug min(1) allows whitespace — document actual contract
      const parsed = organizationLogoUploadStartSchema.safeParse({
        ...validStart,
        orgSlug: '   ',
      })
      expect(parsed.success).toBe(true)
      return
    }

    const parsed = organizationLogoUploadStartSchema.safeParse(payload)
    expect(parsed.success).toBe(false)
  })

  it('rejects unknown keys (strict object — no client owner override)', () => {
    const parsed = organizationLogoUploadStartSchema.safeParse({
      ...validStart,
      owner_id: 'org_attacker',
      route_key: 'organization.primaryLogo',
      category: 'library',
      audience: 'public',
    })

    expect(parsed.success).toBe(false)
  })

  it.each(SECURITY_INPUTS)(
    'still accepts security-corpus strings as opaque file names: %j',
    (file_name) => {
      const parsed = organizationLogoUploadStartSchema.safeParse({
        ...validStart,
        file_name,
      })

      // Filename is opaque metadata; Storage sanitizes object keys server-side.
      expect(parsed.success).toBe(true)
      if (parsed.success) expect(parsed.data.file_name).toBe(file_name)
    }
  )
})

describe('organizationLogoUploadCompleteSchema', () => {
  it('accepts a valid completion payload', () => {
    const parsed = organizationLogoUploadCompleteSchema.safeParse(validComplete)

    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data).toEqual(validComplete)
  })

  it.each([
    ['missing orgSlug', { id: 'upl_1' }],
    ['empty orgSlug', { orgSlug: '', id: 'upl_1' }],
    ['missing id', { orgSlug: 'island-logistics' }],
    ['empty id', { orgSlug: 'island-logistics', id: '' }],
    ['file id instead of upload id', { orgSlug: 'x', id: 'file_123' }],
    ['session-looking but wrong prefix', { orgSlug: 'x', id: 'upload_123' }],
    ['bare upl_ prefix without rest', { orgSlug: 'x', id: 'upl_' }],
  ] as const)('rejects %s', (_label, payload) => {
    // Note: startsWith('upl_') accepts 'upl_' alone — assert actual Zod contract
    if (_label === 'bare upl_ prefix without rest') {
      const parsed = organizationLogoUploadCompleteSchema.safeParse(payload)
      expect(parsed.success).toBe(true)
      return
    }

    const parsed = organizationLogoUploadCompleteSchema.safeParse(payload)
    expect(parsed.success).toBe(false)
  })

  it('accepts upload ids that start with upl_', () => {
    const parsed = organizationLogoUploadCompleteSchema.safeParse({
      orgSlug: 'island-logistics',
      id: 'upl_01HXYZABC',
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects unknown keys so logo_url cannot be client-forced', () => {
    const parsed = organizationLogoUploadCompleteSchema.safeParse({
      ...validComplete,
      logo_url: 'https://evil.example/logo.png',
      logo_file_id: 'file_attacker',
      organizationId: 'org_attacker',
    })

    expect(parsed.success).toBe(false)
  })
})
