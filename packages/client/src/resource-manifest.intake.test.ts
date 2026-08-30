import { describe, expect, it } from 'vitest'
import { RESOURCE_MANIFEST } from './resource-manifest.js'

describe('RESOURCE_MANIFEST - intake forms ownership', () => {
  it('maps requestForms to crm with versioned meaning', () => {
    // ARRANGE - manifest is the contract under test
    const entry = RESOURCE_MANIFEST.requestForms
    // ACT & ASSERT - assert full shape, not just existence
    expect(entry).toEqual({
      owner: 'crm',
      meaning: 'versioned CRM request intake definitions and routing defaults',
    })
  })

  it('maps requestFormSubmissions to crm as immutable submissions', () => {
    expect(RESOURCE_MANIFEST.requestFormSubmissions).toEqual({
      owner: 'crm',
      meaning:
        'immutable intake submissions that atomically create ordinary CRM requests',
    })
  })

  it('maps requestFormRequests to crm as customer-scoped projection', () => {
    expect(RESOURCE_MANIFEST.requestFormRequests).toEqual({
      owner: 'crm',
      meaning:
        'customer-scoped request projection used by reusable intake/support surfaces',
    })
  })

  it('keeps all intake resources owned by crm (not core or billing)', () => {
    for (const key of [
      'requestForms',
      'requestFormSubmissions',
      'requestFormRequests',
    ] as const) {
      expect(RESOURCE_MANIFEST[key].owner).toBe('crm')
    }
  })

  it('keeps requestForms meaning distinct from requests and requestCategories', () => {
    expect(RESOURCE_MANIFEST.requestForms.meaning).not.toBe(
      RESOURCE_MANIFEST.requests.meaning
    )
    expect(RESOURCE_MANIFEST.requestForms.meaning).not.toBe(
      RESOURCE_MANIFEST.requestCategories.meaning
    )
  })

  it('exposes a stable set of keys including the three new intake nouns', () => {
    expect(Object.keys(RESOURCE_MANIFEST)).toEqual(
      expect.arrayContaining([
        'requestForms',
        'requestFormSubmissions',
        'requestFormRequests',
      ])
    )
  })

  it('keeps every owner value within the ServiceOwner union', () => {
    const allowed = new Set([
      'core',
      'billing',
      'couriers',
      'crm',
      'work',
      'storage',
      'widgets',
    ])
    for (const [, value] of Object.entries(RESOURCE_MANIFEST)) {
      expect(allowed.has(value.owner)).toBe(true)
    }
  })
})
