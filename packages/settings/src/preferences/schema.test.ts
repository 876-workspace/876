import { describe, expect, it } from 'vitest'

import { moduleUpdateSchema, preferenceSchema } from './schema'
import type { ModuleDefinition, PreferenceDefinition } from '../types'

describe('preferenceSchema', () => {
  it.each([
    [{ key: 'flag', label: 'Flag', type: 'boolean', default: false }, true],
    [
      {
        key: 'name',
        label: 'Name',
        type: 'string',
        default: '',
        maxLength: 3,
      },
      'abc',
    ],
    [
      {
        key: 'mode',
        label: 'Mode',
        type: 'enum',
        default: 'a',
        options: [{ value: 'a', label: 'A' }],
      },
      'a',
    ],
    [
      {
        key: 'count',
        label: 'Count',
        type: 'integer',
        default: 2,
        min: 1,
        max: 3,
      },
      2,
    ],
    [
      {
        key: 'rate',
        label: 'Rate',
        type: 'decimal',
        default: '1.25',
        min: '-2',
        max: '2',
      },
      '1.25',
    ],
    [
      {
        key: 'branch',
        label: 'Branch',
        type: 'reference',
        default: '',
        namespace: 'branches',
      },
      'branch_1',
    ],
  ] satisfies Array<[PreferenceDefinition, unknown]>)(
    'accepts a valid $0.type value',
    (definition, value) => {
      expect(preferenceSchema(definition).safeParse(value)).toEqual({
        success: true,
        data: value,
      })
    }
  )

  it.each([
    [
      {
        key: 'name',
        label: 'Name',
        type: 'string',
        default: '',
        maxLength: 3,
      },
      'abcd',
    ],
    [
      {
        key: 'mode',
        label: 'Mode',
        type: 'enum',
        default: 'a',
        options: [{ value: 'a', label: 'A' }],
      },
      'b',
    ],
    [
      {
        key: 'count',
        label: 'Count',
        type: 'integer',
        default: 2,
        min: 1,
        max: 3,
      },
      4,
    ],
    [
      {
        key: 'rate',
        label: 'Rate',
        type: 'decimal',
        default: '1',
        min: '-2',
        max: '2',
      },
      '2.00000001',
    ],
    [
      {
        key: 'rate',
        label: 'Rate',
        type: 'decimal',
        default: '1',
      },
      '12345678901234567.1',
    ],
  ] satisfies Array<[PreferenceDefinition, unknown]>)(
    'rejects an invalid $0.type value',
    (definition, value) => {
      expect(preferenceSchema(definition).safeParse(value).success).toBe(false)
    }
  )
})

describe('moduleUpdateSchema', () => {
  const module: ModuleDefinition = {
    key: 'deliveries',
    label: 'Deliveries',
    optional: true,
    enabledByDefault: true,
    preferences: [
      { key: 'editable', label: 'Editable', type: 'boolean', default: false },
      {
        key: 'locked',
        label: 'Locked',
        type: 'string',
        default: '',
        readOnly: true,
      },
    ],
  }

  it('accepts a partial update', () => {
    expect(moduleUpdateSchema(module).safeParse({ editable: true })).toEqual({
      success: true,
      data: { editable: true },
    })
  })

  it('rejects unknown keys', () => {
    const result = moduleUpdateSchema(module).safeParse({ unknown: true })

    expect(result.success).toBe(false)
    if (result.success) throw new Error('Expected parsing to fail')
    expect(result.error.issues[0]?.code).toBe('unrecognized_keys')
  })

  it('rejects read-only keys with a clear message', () => {
    const result = moduleUpdateSchema(module).safeParse({ locked: 'changed' })

    expect(result.success).toBe(false)
    if (result.success) throw new Error('Expected parsing to fail')
    expect(result.error.issues[0]?.message).toBe('locked is read-only')
  })
})
