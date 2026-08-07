/**
 * The onboarding catalog and its validator.
 *
 * Every expectation here was confirmed against `services/onboarding_catalog.py`
 * by dumping both implementations and diffing: **70 fields across 3 targets with
 * 0 differences**, and **267 issues across 25 answer sets with 0 differences**.
 * Reproduce either with the venv:
 *
 *     .venv/bin/python -c "import sys,json; sys.path.insert(0,'.'); \
 *       from services.onboarding_catalog import onboarding_catalog; \
 *       print(onboarding_catalog('organization','global','JM').model_dump_json())"
 *
 * The cases kept below are the ones where a port most easily diverges: what
 * counts as "not answered", and the type checks where JavaScript and Python
 * disagree about what a number is.
 */

import { describe, expect, it } from 'vitest'

import {
  CATALOG_REVISION,
  onboardingCatalog,
  organizationCatalog,
  UnknownCatalogError,
  validateOnboardingAnswers,
} from '../onboarding.catalog'
import type { JsonValue, OnboardingCatalog } from '../onboarding.schemas'

const CORE = onboardingCatalog('organization', 'core', 'JM')
const GLOBAL = onboardingCatalog('organization', 'global', 'JM')
const COURIERS = onboardingCatalog('application', '876-couriers', 'JM')

function codesFor(
  catalog: OnboardingCatalog,
  answers: Record<string, JsonValue>
): string[] {
  return validateOnboardingAnswers(catalog, answers)
    .map((issue) => `${issue.path}:${issue.code}`)
    .sort()
}

describe('catalog shape', () => {
  it('reports revision 1', () => {
    expect(CATALOG_REVISION).toBe(1)
    expect(GLOBAL.catalog_revision).toBe(1)
  })

  it('numbers sections by position, starting at zero', () => {
    expect(GLOBAL.sections.map((section) => section.position)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7,
    ])
  })

  it('carries 70 fields in total across the three targets', () => {
    const count = (catalog: OnboardingCatalog): number =>
      catalog.sections.reduce(
        (total, section) =>
          total +
          section.fields.reduce(
            (fieldTotal, field) => fieldTotal + 1 + field.item_fields.length,
            0
          ),
        0
      )

    expect(count(CORE) + count(GLOBAL) + count(COURIERS)).toBe(70)
  })

  it('uppercases the country code', () => {
    expect(onboardingCatalog('organization', 'core', 'jm').country_code).toBe(
      'JM'
    )
  })

  it('nests the item fields of a collection', () => {
    const leadership = GLOBAL.sections.find(
      (section) => section.key === 'leadership'
    )
    const directors = leadership?.fields.find(
      (field) => field.key === 'directors'
    )

    expect(directors?.field_type).toBe('collection')
    expect(directors?.min_items).toBe(1)
    expect(directors?.item_fields.map((field) => field.key)).toEqual([
      'first_name',
      'last_name',
      'title',
      'individual_trn',
      'responsibility_start_date',
    ])
  })

  it('records a conditional requirement as a condition, not as required', () => {
    const registrations = GLOBAL.sections.find(
      (section) => section.key === 'registrations'
    )
    const gctNumber = registrations?.fields.find(
      (field) => field.key === 'gct_number'
    )

    expect(gctNumber?.required).toBe(false)
    expect(gctNumber?.required_when).toEqual({
      field_key: 'gct_registered',
      equals: true,
    })
  })

  it('nulls an absent optional attribute rather than omitting it', () => {
    const tradeName = GLOBAL.sections[0]?.fields.find(
      (field) => field.key === 'trade_name'
    )

    expect(tradeName?.description).toBeNull()
    expect(tradeName?.placeholder).toBeNull()
    expect(tradeName?.pattern).toBeNull()
    expect(tradeName?.min_items).toBeNull()
    expect(tradeName?.required_when).toBeNull()
  })
})

describe('unknown catalogs', () => {
  it.each([
    ['a country with no catalog', () => organizationCatalog('US')],
    ['an unknown revision', () => organizationCatalog('JM', 99)],
    [
      'an unregistered application',
      () => onboardingCatalog('application', '876-nope', 'JM'),
    ],
    [
      'an unknown organization target',
      () => onboardingCatalog('organization', 'nonsense', 'JM'),
    ],
    [
      'a malformed country code',
      () => onboardingCatalog('organization', 'core', 'JAM'),
    ],
    [
      'an unknown revision on a non-global target',
      () => onboardingCatalog('organization', 'core', 'JM', 99),
    ],
  ])('rejects %s', (_label, call) => {
    expect(call).toThrow(UnknownCatalogError)
  })
})

describe('what counts as not answered', () => {
  it.each([
    ['null', null],
    ['an empty string', ''],
    ['an empty array', []],
    ['an empty object', {}],
  ])('treats %s as missing', (_label, value) => {
    expect(codesFor(CORE, { business_category: value as JsonValue })).toEqual([
      'answers.business_category:required',
    ])
  })

  it('treats an absent key as missing', () => {
    expect(codesFor(CORE, {})).toEqual(['answers.business_category:required'])
  })

  it('does not treat false or zero as missing', () => {
    // Both are answers. A required boolean answered `false` is answered.
    const issues = codesFor(GLOBAL, {
      gct_registered: false,
      expected_monthly_transactions: 0,
    })

    expect(issues).not.toContain('answers.gct_registered:required')
    expect(issues).not.toContain(
      'answers.expected_monthly_transactions:required'
    )
  })
})

describe('type checks', () => {
  it('rejects a boolean where a whole number is expected', () => {
    // Python needed an explicit isinstance(value, bool) guard here because bool
    // is a subclass of int; JavaScript gets it right for free.
    expect(codesFor(GLOBAL, { expected_monthly_transactions: true })).toContain(
      'answers.expected_monthly_transactions:invalid_type'
    )
  })

  it('rejects a fractional number where a whole number is expected', () => {
    expect(codesFor(GLOBAL, { expected_monthly_transactions: 1.5 })).toContain(
      'answers.expected_monthly_transactions:invalid_type'
    )
  })

  it('accepts a whole number', () => {
    expect(
      codesFor(GLOBAL, { expected_monthly_transactions: 500 })
    ).not.toContain('answers.expected_monthly_transactions:invalid_type')
  })

  it('rejects a non-boolean for a boolean field', () => {
    expect(codesFor(GLOBAL, { gct_registered: 'yes' })).toContain(
      'answers.gct_registered:invalid_type'
    )
  })

  it('rejects a non-list for a collection', () => {
    expect(codesFor(GLOBAL, { directors: 'nope' })).toContain(
      'answers.directors:invalid_type'
    )
  })

  it('rejects a number where text is expected', () => {
    expect(codesFor(GLOBAL, { legal_name: 42 })).toContain(
      'answers.legal_name:invalid_type'
    )
  })
})

describe('patterns', () => {
  it.each([
    ['123-456-789', true],
    ['123456789', true],
    ['123-456789', true],
    ['12-34', false],
    ['1234567890', false],
    ['abc-def-ghi', false],
  ])('accepts %s as a TRN: %s', (value, valid) => {
    const issues = codesFor(GLOBAL, { trn: value })

    expect(issues.includes('answers.trn:invalid_format')).toBe(!valid)
  })

  it('anchors the pattern at both ends', () => {
    // An unanchored match would accept a TRN with trailing junk.
    expect(codesFor(GLOBAL, { trn: '123-456-789xyz' })).toContain(
      'answers.trn:invalid_format'
    )
  })
})

describe('options', () => {
  it('rejects an unsupported select option', () => {
    expect(codesFor(CORE, { business_category: 'spaceflight' })).toContain(
      'answers.business_category:invalid_option'
    )
  })

  it('rejects an unsupported entry in a multiselect', () => {
    expect(
      codesFor(GLOBAL, { products_of_interest: ['billing', 'nope'] })
    ).toContain('answers.products_of_interest:invalid_option')
  })

  it('accepts a valid multiselect', () => {
    expect(
      codesFor(GLOBAL, { products_of_interest: ['billing'] })
    ).not.toContain('answers.products_of_interest:invalid_option')
  })

  it('rejects a non-string entry in a multiselect', () => {
    expect(codesFor(GLOBAL, { products_of_interest: [1] })).toContain(
      'answers.products_of_interest:invalid_option'
    )
  })
})

describe('collections', () => {
  it('reports too few items against the collection itself', () => {
    expect(codesFor(GLOBAL, { directors: [] })).toContain(
      'answers.directors:required'
    )
  })

  it('reports a non-object item at the item path', () => {
    expect(codesFor(GLOBAL, { directors: ['nope'] })).toContain(
      'answers.directors.0:invalid_type'
    )
  })

  it('validates each item field at its own path', () => {
    expect(codesFor(GLOBAL, { directors: [{ first_name: 'Ada' }] })).toEqual(
      expect.arrayContaining([
        'answers.directors.0.last_name:required',
        'answers.directors.0.title:required',
      ])
    )
  })

  it('reports an unknown field inside an item', () => {
    expect(
      codesFor(GLOBAL, {
        directors: [
          { first_name: 'Ada', last_name: 'L', title: 'CTO', surprise: 1 },
        ],
      })
    ).toContain('answers.directors.0.surprise:unknown_field')
  })

  it('applies a nested pattern inside an item', () => {
    expect(
      codesFor(GLOBAL, {
        directors: [
          {
            first_name: 'Ada',
            last_name: 'L',
            title: 'CTO',
            individual_trn: 'nope',
          },
        ],
      })
    ).toContain('answers.directors.0.individual_trn:invalid_format')
  })
})

describe('conditional requirements', () => {
  it('requires the dependent field once the condition matches', () => {
    expect(codesFor(GLOBAL, { gct_registered: true })).toContain(
      'answers.gct_number:required'
    )
  })

  it('does not require it when the condition does not match', () => {
    expect(codesFor(GLOBAL, { gct_registered: false })).not.toContain(
      'answers.gct_number:required'
    )
  })

  it('is satisfied once the dependent field is answered', () => {
    expect(
      codesFor(GLOBAL, { gct_registered: true, gct_number: 'GCT-1' })
    ).not.toContain('answers.gct_number:required')
  })
})

describe('unknown answers', () => {
  it('reports a key that is in no section', () => {
    expect(
      codesFor(CORE, { business_category: 'retail', surprise: 1 })
    ).toEqual(['answers.surprise:unknown_field'])
  })
})

describe('a complete core answer set', () => {
  it('produces no issues', () => {
    expect(
      validateOnboardingAnswers(CORE, {
        business_category: 'retail',
        employee_count_range: '2-10',
      })
    ).toEqual([])
  })
})
