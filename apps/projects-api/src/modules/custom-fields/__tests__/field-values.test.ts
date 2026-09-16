import { describe, expect, it } from 'vitest'

import {
  buildCustomFieldValueData,
  type CustomFieldValue,
  customFieldOptionKeys,
  isEmptyCustomFieldValue,
  missingRequiredFieldKey,
} from '../field-values.js'

const selectField = {
  fieldType: 'select',
  options: [
    { key: 'low', label: 'Low' },
    { key: 'high', label: 'High' },
  ],
}

describe('custom field value plumbing', () => {
  it('reads option keys from configured options', () => {
    expect(customFieldOptionKeys(selectField.options)).toEqual(['low', 'high'])
  })

  it('reads no option keys from missing options', () => {
    expect(customFieldOptionKeys(null)).toEqual([])
    expect(customFieldOptionKeys([{ label: 'No key' }])).toEqual([])
  })

  it('treats null, empty string, and empty arrays as empty', () => {
    expect(isEmptyCustomFieldValue(null)).toBe(true)
    expect(isEmptyCustomFieldValue('')).toBe(true)
    expect(isEmptyCustomFieldValue([])).toBe(true)
  })

  it('treats populated values as non-empty', () => {
    expect(isEmptyCustomFieldValue('high')).toBe(false)
    expect(isEmptyCustomFieldValue(0)).toBe(false)
    expect(isEmptyCustomFieldValue(false)).toBe(false)
    expect(isEmptyCustomFieldValue(['low'])).toBe(false)
  })

  it('maps text-likes onto the string column', () => {
    for (const fieldType of ['text', 'textarea', 'user', 'url']) {
      const parsed = buildCustomFieldValueData(
        { fieldType, options: null },
        'hello'
      )
      expect(parsed.error).toBeNull()
      expect(parsed.data).toMatchObject({ stringValue: 'hello' })
    }
  })

  it('rejects non-strings for text fields', () => {
    const parsed = buildCustomFieldValueData(
      { fieldType: 'text', options: null },
      3
    )
    expect(parsed.error?.code).toBe('projects/custom-field-value-invalid')
  })

  it('maps integers onto the integer column', () => {
    const parsed = buildCustomFieldValueData(
      { fieldType: 'number', options: null },
      3
    )
    expect(parsed.data).toMatchObject({ integerValue: 3 })
  })

  it('rejects floats and strings for number fields', () => {
    expect(
      buildCustomFieldValueData({ fieldType: 'number', options: null }, 3.5)
        .error?.code
    ).toBe('projects/custom-field-value-invalid')
    expect(
      buildCustomFieldValueData({ fieldType: 'number', options: null }, '3')
        .error?.code
    ).toBe('projects/custom-field-value-invalid')
  })

  it('carries decimal strings through without float conversion', () => {
    const parsed = buildCustomFieldValueData(
      { fieldType: 'decimal', options: null },
      '3.14'
    )
    expect(parsed.data).toMatchObject({ decimalValue: '3.14' })
  })

  it('rejects malformed decimal strings', () => {
    for (const value of ['3.14159265', 'abc', '3.', '']) {
      if (value === '') continue
      expect(
        buildCustomFieldValueData({ fieldType: 'decimal', options: null }, value)
          .error?.code
      ).toBe('projects/custom-field-value-invalid')
    }
  })

  it('maps booleans onto the boolean column', () => {
    const parsed = buildCustomFieldValueData(
      { fieldType: 'boolean', options: null },
      true
    )
    expect(parsed.data).toMatchObject({ booleanValue: true })
  })

  it('rejects non-booleans for boolean fields', () => {
    expect(
      buildCustomFieldValueData(
        { fieldType: 'boolean', options: null },
        'true'
      ).error?.code
    ).toBe('projects/custom-field-value-invalid')
  })

  it('maps unix seconds onto the date column as bigint', () => {
    const parsed = buildCustomFieldValueData(
      { fieldType: 'date', options: null },
      1787767200
    )
    expect(parsed.data).toMatchObject({ dateValue: 1787767200n })
  })

  it('rejects non-integers for date fields', () => {
    expect(
      buildCustomFieldValueData(
        { fieldType: 'date', options: null },
        '1787767200'
      ).error?.code
    ).toBe('projects/custom-field-value-invalid')
  })

  it('maps a declared option onto the select column', () => {
    const parsed = buildCustomFieldValueData(selectField, 'high')
    expect(parsed.data).toMatchObject({ selectKey: 'high' })
  })

  it('rejects an undeclared select option', () => {
    expect(buildCustomFieldValueData(selectField, 'critical').error?.code).toBe(
      'projects/custom-field-option-invalid'
    )
  })

  it('rejects a non-string select value as an option mismatch', () => {
    expect(buildCustomFieldValueData(selectField, 3).error?.code).toBe(
      'projects/custom-field-option-invalid'
    )
  })

  it('maps declared options onto the multi-select column', () => {
    const parsed = buildCustomFieldValueData(
      { ...selectField, fieldType: 'multi-select' },
      ['low', 'high']
    )
    expect(parsed.data).toMatchObject({ selectKeys: ['low', 'high'] })
  })

  it('rejects undeclared multi-select options', () => {
    expect(
      buildCustomFieldValueData(
        { ...selectField, fieldType: 'multi-select' },
        ['low', 'critical']
      ).error?.code
    ).toBe('projects/custom-field-option-invalid')
  })

  it('clears the stored value for empty inputs', () => {
    for (const value of [null, '', [] as string[]] as CustomFieldValue[]) {
      const parsed = buildCustomFieldValueData(selectField, value)
      expect(parsed.error).toBeNull()
      expect(parsed.data).toBeNull()
    }
  })

  it('reports the first required field left without a value', () => {
    const fields = [
      { id: 'f1', key: 'one', required: true },
      { id: 'f2', key: 'two', required: true },
    ]
    expect(
      missingRequiredFieldKey(
        fields,
        [{ fieldId: 'f1', value: 'x' }],
        new Set()
      )
    ).toBe('two')
  })

  it('accepts stored values for required fields without inputs', () => {
    const fields = [{ id: 'f1', key: 'one', required: true }]
    expect(missingRequiredFieldKey(fields, [], new Set(['f1']))).toBeNull()
  })

  it('treats empty inputs as missing for required fields', () => {
    const fields = [{ id: 'f1', key: 'one', required: true }]
    expect(
      missingRequiredFieldKey(
        fields,
        [{ fieldId: 'f1', value: '' }],
        new Set(['f1'])
      )
    ).toBe('one')
  })

  it('ignores optional fields when checking required state', () => {
    const fields = [{ id: 'f1', key: 'one', required: false }]
    expect(missingRequiredFieldKey(fields, [], new Set())).toBeNull()
  })
})
