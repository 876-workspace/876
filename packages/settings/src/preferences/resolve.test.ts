import { describe, expect, it } from 'vitest'

import {
  diffPreferences,
  resolveCatalogPreferences,
  resolveModulePreferences,
} from './resolve'
import type { ModuleDefinition, StoredPreferenceRow } from '../types'

const module: ModuleDefinition = {
  key: 'deliveries',
  label: 'Deliveries',
  optional: true,
  enabledByDefault: true,
  preferences: [
    { key: 'enabled', label: 'Enabled', type: 'boolean', default: false },
    { key: 'attempts', label: 'Attempts', type: 'integer', default: 1 },
  ],
}

function row(overrides: Partial<StoredPreferenceRow>): StoredPreferenceRow {
  return {
    module: 'deliveries',
    key: 'enabled',
    valueType: 'boolean',
    stringValue: null,
    integerValue: null,
    decimalValue: null,
    booleanValue: true,
    referenceNamespace: null,
    referenceKey: null,
    ...overrides,
  }
}

describe('resolveModulePreferences', () => {
  it('returns defaults with no rows', () => {
    expect(resolveModulePreferences(module, [])).toEqual({
      enabled: false,
      attempts: 1,
    })
  })

  it('overlays partial rows', () => {
    expect(resolveModulePreferences(module, [row({})])).toEqual({
      enabled: true,
      attempts: 1,
    })
  })

  it('ignores rows for unknown keys', () => {
    expect(resolveModulePreferences(module, [row({ key: 'unknown' })])).toEqual(
      { enabled: false, attempts: 1 }
    )
  })

  it('ignores rows for another module', () => {
    expect(
      resolveModulePreferences(module, [row({ module: 'billing' })])
    ).toEqual({ enabled: false, attempts: 1 })
  })
})

describe('resolveCatalogPreferences', () => {
  it('resolves every module keyed by module name', () => {
    expect(resolveCatalogPreferences([module], [row({})])).toEqual({
      deliveries: { enabled: true, attempts: 1 },
    })
  })
})

describe('diffPreferences', () => {
  it('encodes only known changed values', () => {
    expect(
      diffPreferences(
        module,
        { enabled: false, attempts: 1 },
        { enabled: true, attempts: 1, unknown: 'ignored' }
      )
    ).toEqual([row({})])
  })

  it('ignores invalid changed values', () => {
    expect(
      diffPreferences(
        module,
        { enabled: false, attempts: 1 },
        { attempts: 1.5 }
      )
    ).toEqual([])
  })
})
