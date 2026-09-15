import { describe, expect, it } from 'vitest'

import { renderTemplateContent } from './placeholders'

const ADDRESS_FORMAT = [
  '%address.line1%',
  '%address.line2%',
  '%address.city% %address.state% %address.postalCode%',
  '%address.country%',
].join('\n')

const SECURITY_VALUES: [string, string][] = [
  ['a script tag', '<script>alert(1)</script>'],
  ['a quote breakout', "\"' OR '1'='1\""],
  ['a right-to-left override', '\u202e'],
  ['a ten thousand character value', 'a'.repeat(10_000)],
]

describe('renderTemplateContent substitution', () => {
  it('substitutes a known token with its value', () => {
    expect(
      renderTemplateContent('From %organization.name%', {
        'organization.name': '876 Couriers',
      })
    ).toBe('From 876 Couriers')
  })

  it('substitutes several tokens on one line', () => {
    expect(
      renderTemplateContent('%document.number% on %document.date%', {
        'document.number': 'INV-001',
        'document.date': '2026-09-15',
      })
    ).toBe('INV-001 on 2026-09-15')
  })

  it('leaves an unknown token untouched', () => {
    expect(
      renderTemplateContent('%organization.slogan%', {
        'organization.name': '876 Couriers',
      })
    ).toBe('%organization.slogan%')
  })

  it('does not re-expand tokens that appear inside substituted values', () => {
    expect(
      renderTemplateContent('%organization.name%', {
        'organization.name': '%customer.name%',
      })
    ).toBe('%customer.name%')
  })
})

describe('renderTemplateContent line handling', () => {
  it('drops a line whose only content is a token with a null value', () => {
    expect(
      renderTemplateContent('a\n%organization.phone%\nb', {
        'organization.phone': null,
      })
    ).toBe('a\nb')
  })

  it('drops a line whose only content is a token with no value at all', () => {
    expect(renderTemplateContent('a\n%organization.phone%\nb', {})).toBe('a\nb')
  })

  it('keeps a line with literal text when its token renders empty', () => {
    expect(
      renderTemplateContent('Tel: %organization.phone%', {
        'organization.phone': null,
      })
    ).toBe('Tel:')
  })

  it('keeps a blank line that contains no tokens', () => {
    expect(renderTemplateContent('a\n\nb', {})).toBe('a\n\nb')
  })

  it('renders an address without a blank row when line2 is missing', () => {
    expect(
      renderTemplateContent(ADDRESS_FORMAT, {
        'address.line1': '1 Harbour Street',
        'address.city': 'Kingston',
        'address.state': 'St Andrew',
        'address.postalCode': 'JM0001',
        'address.country': 'Jamaica',
      })
    ).toBe('1 Harbour Street\nKingston St Andrew JM0001\nJamaica')
  })

  it('trims trailing whitespace left behind by an empty token', () => {
    expect(renderTemplateContent('Kingston %address.line2%', {})).toBe(
      'Kingston'
    )
  })

  it('returns an empty string for an empty format', () => {
    expect(renderTemplateContent('', { 'organization.name': '876' })).toBe('')
  })
})

describe('renderTemplateContent security corpus', () => {
  it.each(SECURITY_VALUES)('inserts %s verbatim', (_label, value) => {
    expect(
      renderTemplateContent('%organization.name%', {
        'organization.name': value,
      })
    ).toBe(value)
  })
})
