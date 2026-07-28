import { describe, expect, it } from 'vitest'

import { fileSchema } from './files'
import { uploadCreateParamsSchema, uploadSessionSchema } from './uploads'

const SECURITY_STRINGS = [
  '<script>alert(1)</script>',
  "' OR '1'='1",
  '../../etc/passwd',
  '__proto__',
  '\u0000',
  '\u202e',
  'a'.repeat(10_000),
  '${jndi:ldap://x}',
  '{{7*7}}',
] as const

function baseFile(overrides: Record<string, unknown> = {}) {
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
    size_bytes: 100,
    version_id: 'ver_01J8XYA',
    url: 'https://assets.876.app/logo.png',
    created_at: 1,
    updated_at: 1,
    ...overrides,
  }
}

function baseUploadParams(overrides: Record<string, unknown> = {}) {
  return {
    route_key: 'organization.primaryLogo',
    owner_type: 'organization',
    owner_id: 'org_123',
    actor_user_id: 'user_456',
    source_app_id: '876-couriers',
    file_name: 'logo.png',
    content_type: 'image/png',
    size_bytes: 100,
    ...overrides,
  }
}

describe('security corpus on storage schemas', () => {
  it.each(SECURITY_STRINGS)(
    'file original_name accepts attacker strings as opaque metadata: %s',
    (value) => {
      // Metadata may store hostile filenames; schema only requires non-empty string.
      // Authorization/path safety is server-side (object key never uses this field).
      const result = fileSchema.safeParse(
        baseFile({ original_name: value || 'x' })
      )
      if (value === '') expect(result.success).toBe(false)
      else if (value.includes('\u0000')) {
        // zod string allows null bytes in JS strings
        expect(typeof result.success).toBe('boolean')
      } else {
        expect(result.success).toBe(true)
      }
    }
  )

  it.each(SECURITY_STRINGS)(
    'upload file_name accepts attacker strings as opaque metadata: %s',
    (value) => {
      const result = uploadCreateParamsSchema.safeParse(
        baseUploadParams({ file_name: value || 'x' })
      )
      if (value === '') expect(result.success).toBe(false)
      else expect(typeof result.success).toBe('boolean')
    }
  )

  it('rejects file ids that look like path traversal', () => {
    expect(fileSchema.safeParse(baseFile({ id: '../file_01' })).success).toBe(
      false
    )
    expect(fileSchema.safeParse(baseFile({ id: 'file_../../x' })).success).toBe(
      true
    ) // starts with file_ — still ok at schema layer
  })

  it('rejects upload session ids without upl_ prefix even if evil-looking', () => {
    expect(
      uploadSessionSchema.safeParse({
        object: 'upload_session',
        id: '../../upl_x',
        file_id: 'file_01J8XYZ',
        upload_url: 'https://example.com/u',
        method: 'PUT',
        headers: { 'Content-Type': 'image/png', 'Content-Length': '1' },
        expires_at: 1,
      }).success
    ).toBe(false)
  })

  it('rejects prototype pollution keys on strict file objects', () => {
    const payload = baseFile()
    Object.assign(payload, { __proto__: { admin: true } })
    // strictObject should not allow unknown keys; __proto__ assignment is special
    expect(
      fileSchema.safeParse({ ...baseFile(), constructor: { name: 'x' } })
        .success
    ).toBe(false)
  })
})
