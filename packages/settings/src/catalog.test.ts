import { describe, expect, it } from 'vitest'

import {
  defineModuleCatalog,
  findModule,
  findPreference,
  moduleDefaults,
} from './catalog'
import type { ModuleDefinition } from './types'

const deliveries: ModuleDefinition = {
  key: 'deliveries',
  label: 'Deliveries',
  optional: true,
  enabledByDefault: true,
  preferences: [
    { key: 'proof_required', label: 'Proof', type: 'boolean', default: true },
  ],
}

describe('defineModuleCatalog', () => {
  it('validates and deeply freezes a catalog', () => {
    const catalog = defineModuleCatalog([deliveries])

    expect(catalog).toEqual([deliveries])
    expect(Object.isFrozen(catalog)).toBe(true)
    expect(Object.isFrozen(catalog[0])).toBe(true)
    expect(Object.isFrozen(catalog[0]?.preferences)).toBe(true)
  })

  it('rejects duplicate module keys', () => {
    expect(() =>
      defineModuleCatalog([{ ...deliveries }, { ...deliveries }])
    ).toThrow('Duplicate module key: deliveries')
  })

  it('rejects duplicate preference keys within a module', () => {
    expect(() =>
      defineModuleCatalog([
        {
          ...deliveries,
          preferences: [
            ...deliveries.preferences,
            { ...deliveries.preferences[0]! },
          ],
        },
      ])
    ).toThrow('Duplicate preference key in module deliveries: proof_required')
  })

  it('rejects invalid module keys', () => {
    expect(() =>
      defineModuleCatalog([{ ...deliveries, key: 'Deliveries' }])
    ).toThrow('Invalid module key: Deliveries')
  })

  it('rejects invalid preference keys', () => {
    expect(() =>
      defineModuleCatalog([
        {
          ...deliveries,
          preferences: [
            { ...deliveries.preferences[0]!, key: 'proof-required' },
          ],
        },
      ])
    ).toThrow('Invalid preference key in module deliveries: proof-required')
  })

  it('rejects an enum default outside its options', () => {
    expect(() =>
      defineModuleCatalog([
        {
          ...deliveries,
          preferences: [
            {
              key: 'mode',
              label: 'Mode',
              type: 'enum',
              default: 'missing',
              options: [{ value: 'safe', label: 'Safe' }],
            },
          ],
        },
      ])
    ).toThrow('Default for deliveries.mode is not an enum option')
  })

  it.each([
    {
      preference: {
        key: 'attempts',
        label: 'Attempts',
        type: 'integer' as const,
        default: 0,
        min: 1,
      },
    },
    {
      preference: {
        key: 'rate',
        label: 'Rate',
        type: 'decimal' as const,
        default: '10.01',
        max: '10.00',
      },
    },
  ])(
    'rejects an $preference.type default outside its range',
    ({ preference }) => {
      expect(() =>
        defineModuleCatalog([{ ...deliveries, preferences: [preference] }])
      ).toThrow(`Default for deliveries.${preference.key} is outside its range`)
    }
  )
})

describe('catalog lookups', () => {
  it('finds modules, preferences, and complete defaults', () => {
    const module = { ...deliveries, preferences: [...deliveries.preferences] }
    const catalog = defineModuleCatalog([module])

    expect(findModule(catalog, 'deliveries')).toBe(module)
    expect(findModule(catalog, 'missing')).toBeUndefined()
    expect(findPreference(catalog, 'deliveries', 'proof_required')).toBe(
      module.preferences[0]
    )
    expect(findPreference(catalog, 'missing', 'proof_required')).toBeUndefined()
    expect(moduleDefaults(module)).toEqual({ proof_required: true })
  })
})
