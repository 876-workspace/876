import { describe, expect, it } from 'vitest'

import { generateOrgSlug } from './slug'

describe('generateOrgSlug', () => {
  it.each([
    ['Mango Company Limited', 'mango'],
    ['Global Tech Solutions Co., Inc.', 'global-tech-solutions'],
    ['Quantum Research Private Limited', 'quantum-research'],
    ['XYZ Solutions LLC', 'xyz-solutions'],
    ["Société Générale d'Entreprise Holding", 'societe-generale-d-entreprise'],
    ['NodeJS Innovations GmbH', 'nodejs-innovations'],
    ['Example S.p.A.', 'example'],
    ['Acme Limited Liability Company', 'acme'],
    ['Acme Limited Liability Limited Partnership', 'acme'],
    ['Acme Limited Liability Partnership', 'acme'],
    ['Acme Pvt Ltd', 'acme'],
    ['Acme Pte Ltd', 'acme'],
    ['Acme Pty Ltd', 'acme'],
    ['  Acme   Rocket  Labs  ', 'acme-rocket-labs'],
    ['ACME/Rocket___Labs', 'acme-rocket-labs'],
    ['123 Holdings', '123-holdings'],
  ])('normalizes %s to %s', (name, expected) => {
    expect(generateOrgSlug(name)).toBe(expected)
  })

  it.each(['', '   ', 'LLC', 'Private Limited', 'S.A.'])(
    'returns an empty slug when %j has no core name',
    (name) => {
      expect(generateOrgSlug(name)).toBe('')
    }
  )

  it.each([
    '<script>alert(1)</script>',
    "' OR '1'='1",
    '../../etc/passwd',
    '__proto__',
    '\u0000',
    '\u202e',
  ])('produces a URL-safe slug for security input %j', (name) => {
    const result = generateOrgSlug(name)

    expect(result).toMatch(/^(?:[a-z0-9]+(?:-[a-z0-9]+)*)?$/)
  })
})
