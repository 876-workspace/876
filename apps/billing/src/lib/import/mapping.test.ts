import { describe, expect, it } from 'vitest'

import {
  autoMapHeaders,
  buildRawRows,
  isMappingComplete,
  sampleTemplateCsv,
} from './mapping'

describe('autoMapHeaders', () => {
  it('matches headers by alias, label, and field key (case-insensitive)', () => {
    const mapping = autoMapHeaders([
      'Customer Name',
      'E-mail',
      'company',
      'externalReference',
    ])

    expect(mapping).toEqual({
      'Customer Name': 'name',
      'E-mail': 'email',
      company: 'companyName',
      externalReference: 'externalReference',
    })
  })

  it('claims each field at most once, leaving later duplicate headers unmapped', () => {
    const mapping = autoMapHeaders(['Name', 'Full Name'])

    expect(mapping.Name).toBe('name')
    expect(mapping['Full Name']).toBe('')
  })

  it('leaves an unrecognized header unmapped', () => {
    const mapping = autoMapHeaders(['Loyalty Points'])

    expect(mapping['Loyalty Points']).toBe('')
  })
})

describe('buildRawRows', () => {
  it('applies the mapping and drops unmapped and empty cells', () => {
    const rows = [
      { Col1: 'Marlon Grant', Col2: 'marlon@example.com', Col3: '' },
      { Col1: 'Ayana Reid', Col2: '', Col3: 'ignored' },
    ]
    const mapping = { Col1: 'name', Col2: 'email', Col3: '' } as const

    expect(buildRawRows(rows, mapping)).toEqual([
      { name: 'Marlon Grant', email: 'marlon@example.com' },
      { name: 'Ayana Reid' },
    ])
  })
})

describe('isMappingComplete', () => {
  it('is true only once a column maps to name', () => {
    expect(isMappingComplete({ A: 'email' })).toBe(false)
    expect(isMappingComplete({ A: 'email', B: 'name' })).toBe(true)
  })
})

describe('sampleTemplateCsv', () => {
  it('emits a header row of field labels plus example rows', () => {
    const lines = sampleTemplateCsv().split('\r\n')

    expect(lines[0]).toContain('Customer Name')
    expect(lines[0]).toContain('External ID')
    expect(lines.length).toBeGreaterThanOrEqual(3)
  })

  it('escapes cells containing commas or quotes', () => {
    expect(sampleTemplateCsv()).not.toMatch(/[^"],[^,]*"[^,]*,/)
  })
})
