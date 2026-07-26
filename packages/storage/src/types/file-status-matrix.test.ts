import { describe, expect, it } from 'vitest'

import { fileSchema } from './files'

function base(overrides: Record<string, unknown> = {}) {
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
    updated_at: 2,
    ...overrides,
  }
}

const STATUSES = [
  'pending',
  'uploaded',
  'ready',
  'failed',
  'deleted',
] as const
const AUDIENCES = ['private', 'organization', 'app', 'public'] as const
const CATEGORIES = ['library', 'attachment', 'system'] as const

describe('fileSchema full status×audience×category matrix', () => {
  for (const status of STATUSES) {
    for (const audience of AUDIENCES) {
      for (const category of CATEGORIES) {
        const needsUrl = audience === 'public' && status === 'ready'
        it(`${category}/${audience}/${status} url=${needsUrl ? 'required' : 'null'}`, () => {
          const result = fileSchema.safeParse(
            base({
              status,
              audience,
              category,
              url: needsUrl ? 'https://assets.876.app/x' : null,
            })
          )
          expect(result.success).toBe(true)
        })

        it(`${category}/${audience}/${status} wrong url fails`, () => {
          const result = fileSchema.safeParse(
            base({
              status,
              audience,
              category,
              // invert the rule
              url: needsUrl ? null : 'https://assets.876.app/x',
            })
          )
          expect(result.success).toBe(false)
        })
      }
    }
  }
})
