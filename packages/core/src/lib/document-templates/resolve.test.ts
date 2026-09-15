import { describe, expect, it } from 'vitest'

import { layoutDefaults } from './layouts'
import { resolveDocumentTemplate } from './resolve'
import { documentTemplateSettingsSchema } from './schema'

const INVOICE_DEFAULTS = layoutDefaults('standard', 'invoice')

const NON_OBJECT_OVERRIDES: [unknown][] = [
  [undefined],
  [null],
  ['x'],
  [42],
  [[]],
]

function deepFreeze(value: unknown): void {
  if (typeof value !== 'object' || value === null) return
  for (const key of Object.keys(value))
    deepFreeze((value as Record<string, unknown>)[key])
  Object.freeze(value)
}

describe('resolveDocumentTemplate fallback', () => {
  it.each(NON_OBJECT_OVERRIDES)(
    'resolves %j overrides to the layout defaults',
    (overrides) => {
      expect(resolveDocumentTemplate('standard', 'invoice', overrides)).toEqual(
        INVOICE_DEFAULTS
      )
    }
  )

  it('resolves an empty overrides object to the layout defaults', () => {
    expect(resolveDocumentTemplate('standard', 'invoice', {})).toEqual(
      INVOICE_DEFAULTS
    )
  })

  it('ignores an unknown top-level section', () => {
    expect(
      resolveDocumentTemplate('standard', 'invoice', {
        unknownSection: { general: { paperSize: 'letter' } },
      })
    ).toEqual(INVOICE_DEFAULTS)
  })
})

describe('resolveDocumentTemplate section merging', () => {
  it('applies a valid partial section and leaves everything else at its default', () => {
    const resolved = resolveDocumentTemplate('standard', 'invoice', {
      general: { paperSize: 'letter' },
    })
    expect(resolved.general.paperSize).toBe('letter')
    expect(resolved).toEqual({
      ...INVOICE_DEFAULTS,
      general: { ...INVOICE_DEFAULTS.general, paperSize: 'letter' },
    })
  })

  it('merges a nested block style over its defaults', () => {
    const resolved = resolveDocumentTemplate('standard', 'invoice', {
      table: { header: { backgroundColor: '#000000' } },
    })
    expect(resolved.table.header).toEqual({
      fontSize: 9,
      fontColor: '#ffffff',
      backgroundColor: '#000000',
    })
  })

  it('falls back a malformed section while applying a valid sibling section', () => {
    const resolved = resolveDocumentTemplate('standard', 'invoice', {
      general: { fontSize: 'big' },
      header: { show: true },
    })
    expect(resolved.general).toEqual(INVOICE_DEFAULTS.general)
    expect(resolved.header).toEqual({
      ...INVOICE_DEFAULTS.header,
      show: true,
    })
  })
})

describe('resolveDocumentTemplate keyed lists', () => {
  it('applies a column override by key and keeps the default order', () => {
    const resolved = resolveDocumentTemplate('standard', 'invoice', {
      table: { columns: [{ key: 'tax', show: true, label: 'GCT' }] },
    })
    expect(
      resolved.table.columns.find((column) => column.key === 'tax')
    ).toEqual({ key: 'tax', show: true, label: 'GCT', widthPercent: null })
    expect(resolved.table.columns.map((column) => column.key)).toEqual(
      INVOICE_DEFAULTS.table.columns.map((column) => column.key)
    )
    expect(
      resolved.table.columns.filter((column) => column.key !== 'tax')
    ).toEqual(
      INVOICE_DEFAULTS.table.columns.filter((column) => column.key !== 'tax')
    )
  })

  it('does not add a column for an unknown key', () => {
    const resolved = resolveDocumentTemplate('standard', 'invoice', {
      table: { columns: [{ key: 'profit', show: true, label: 'Profit' }] },
    })
    expect(resolved.table.columns).toHaveLength(
      INVOICE_DEFAULTS.table.columns.length
    )
    expect(resolved.table.columns).toEqual(INVOICE_DEFAULTS.table.columns)
  })

  it('never lets a stored entry change a column key', () => {
    const resolved = resolveDocumentTemplate('standard', 'invoice', {
      table: {
        columns: [
          { key: 'tax', show: true, label: 'GCT' },
          { key: 'subtotal', show: true, label: 'Subtotal' },
        ],
      },
    })
    expect(resolved.table.columns.map((column) => column.key)).toEqual(
      INVOICE_DEFAULTS.table.columns.map((column) => column.key)
    )
    expect(
      resolved.table.columns.find((column) => column.key === 'tax')?.label
    ).toBe('GCT')
  })

  it('keeps the default columns when the stored columns value is not an array', () => {
    const resolved = resolveDocumentTemplate('standard', 'invoice', {
      table: { columns: 'x' },
    })
    expect(resolved.table.columns).toEqual(INVOICE_DEFAULTS.table.columns)
  })

  it('hides a detail field through an override and keeps the field order', () => {
    const resolved = resolveDocumentTemplate('standard', 'invoice', {
      documentDetails: { fields: [{ key: 'due-date', show: false }] },
    })
    expect(
      resolved.documentDetails.fields.find((field) => field.key === 'due-date')
    ).toEqual({ key: 'due-date', show: false, label: 'Due Date' })
    expect(resolved.documentDetails.fields.map((field) => field.key)).toEqual(
      INVOICE_DEFAULTS.documentDetails.fields.map((field) => field.key)
    )
  })
})

describe('resolveDocumentTemplate result validity', () => {
  it('always returns settings the resolved schema accepts', () => {
    const resolved = resolveDocumentTemplate('standard', 'invoice', {
      general: { paperSize: 'letter', fontSize: 'big' },
      header: { show: true, content: 'x'.repeat(2001) },
      table: { columns: 'x' },
      documentDetails: { fields: [{ key: 'due-date', show: 'yes' }] },
      unknownSection: { paperSize: 'a3' },
    })
    expect(documentTemplateSettingsSchema.parse(resolved)).toEqual(resolved)
  })

  it('does not mutate the overrides it is given', () => {
    const overrides = {
      general: { paperSize: 'letter', margins: { top: 1 } },
      table: { columns: [{ key: 'tax', show: true, label: 'GCT' }] },
    }
    const snapshot = structuredClone(overrides)
    deepFreeze(overrides)
    resolveDocumentTemplate('standard', 'invoice', overrides)
    expect(overrides).toEqual(snapshot)
  })

  it('normalizes a stored accent color to lowercase hex', () => {
    const resolved = resolveDocumentTemplate('standard', 'invoice', {
      general: { accentColor: '#ABCDEF' },
    })
    expect(resolved.general.accentColor).toBe('#abcdef')
    expect(resolved.general).toEqual({
      ...INVOICE_DEFAULTS.general,
      accentColor: '#abcdef',
    })
  })
})
