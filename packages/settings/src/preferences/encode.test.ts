import { describe, expect, it } from 'vitest'

import { decodePreference, encodePreference } from './encode'
import type {
  PreferenceDefinition,
  PreferenceValue,
  StoredPreferenceRow,
} from '../types'

const definitions = [
  { key: 'flag', label: 'Flag', type: 'boolean', default: false },
  { key: 'name', label: 'Name', type: 'string', default: 'default' },
  {
    key: 'mode',
    label: 'Mode',
    type: 'enum',
    default: 'safe',
    options: [
      { value: 'safe', label: 'Safe' },
      { value: 'fast', label: 'Fast' },
    ],
  },
  { key: 'count', label: 'Count', type: 'integer', default: 1 },
  { key: 'rate', label: 'Rate', type: 'decimal', default: '0' },
  {
    key: 'branch',
    label: 'Branch',
    type: 'reference',
    default: 'branch_default',
    namespace: 'branches',
  },
] satisfies PreferenceDefinition[]

const values: PreferenceValue[] = [
  true,
  'Courier',
  'fast',
  12,
  '12345678.12345678',
  'branch_123',
]

describe('encodePreference and decodePreference', () => {
  it.each(definitions.map((definition, index) => [definition, values[index]!]))(
    'round-trips $0.type through its typed column',
    (definition, value) => {
      const encoded = encodePreference(definition, value, MODULE)

      expect(encoded.error).toBeNull()
      if (!encoded.data) throw new Error('Expected encoding to succeed')
      expect(decodePreference(definition, encoded.data)).toBe(value)
      expect(encoded.data).toEqual(expectedRow(definition, value))
    }
  )

  it.each(definitions)(
    'falls back for $type when the stored value type is stale',
    (definition) => {
      const row = expectedRow(definition, definition.default)
      row.valueType = definition.type === 'boolean' ? 'string' : 'boolean'

      expect(decodePreference(definition, row)).toBe(definition.default)
    }
  )

  it.each(definitions)(
    'falls back for $type when its typed column is null',
    (definition) => {
      const row = expectedRow(definition, definition.default)
      row.stringValue = null
      row.integerValue = null
      row.decimalValue = null
      row.booleanValue = null
      row.referenceKey = null

      expect(decodePreference(definition, row)).toBe(definition.default)
    }
  )

  it('falls back when a reference namespace is stale', () => {
    const definition = definitions[5]!
    const row = expectedRow(definition, 'branch_123')
    row.referenceNamespace = 'warehouses'

    expect(decodePreference(definition, row)).toBe('branch_default')
  })

  it('returns a client-safe validation error', () => {
    const result = encodePreference(definitions[0]!, 'not-a-boolean', MODULE)

    expect(result).toEqual({
      data: null,
      error: {
        code: 'settings/invalid-preference',
        message: 'Invalid input: expected boolean, received string',
        param: 'flag',
      },
    })
  })
})

const MODULE = 'deliveries'

function expectedRow(
  definition: PreferenceDefinition,
  value: PreferenceValue
): StoredPreferenceRow {
  const row: StoredPreferenceRow = {
    module: MODULE,
    key: definition.key,
    valueType: definition.type,
    stringValue: null,
    integerValue: null,
    decimalValue: null,
    booleanValue: null,
    referenceNamespace: null,
    referenceKey: null,
  }

  if (definition.type === 'boolean') row.booleanValue = value as boolean
  if (definition.type === 'string' || definition.type === 'enum')
    row.stringValue = value as string
  if (definition.type === 'integer') row.integerValue = value as number
  if (definition.type === 'decimal') row.decimalValue = value as string
  if (definition.type === 'reference') {
    row.referenceNamespace = definition.namespace
    row.referenceKey = value as string
  }

  return row
}
