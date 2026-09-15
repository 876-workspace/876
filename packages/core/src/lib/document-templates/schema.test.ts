import { describe, expect, it } from 'vitest'

import { DOCUMENT_TEMPLATE_LAYOUTS, layoutDefaults } from './layouts'
import {
  documentTemplateOverridesSchema,
  documentTemplateSettingsSchema,
  hexColorSchema,
  templateFileIdSchema,
} from './schema'

const VALID_COLORS: [string, string][] = [
  ['#1f6feb', '#1f6feb'],
  ['#1F6FEB', '#1f6feb'],
  ['  #1f6feb ', '#1f6feb'],
  ['  #1F6FEB  ', '#1f6feb'],
]

const INVALID_COLORS: [unknown][] = [
  ['#fff'],
  ['red'],
  ['#12345g'],
  [''],
  ['rgb(0, 0, 0)'],
  [123],
  [null],
]

const INVALID_FILE_IDS: [unknown][] = [
  ['file_'],
  ['abc'],
  ['file_../../x'],
  ['https://x/y.png'],
  [''],
]

const PLAIN_TEXT_PAYLOADS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '"><style>body{display:none}</style>',
]

describe('hexColorSchema', () => {
  it.each(VALID_COLORS)('normalizes %j to %j', (input, expected) => {
    expect(hexColorSchema.parse(input)).toBe(expected)
  })

  it.each(INVALID_COLORS)('rejects %j', (value) => {
    expect(hexColorSchema.safeParse(value).success).toBe(false)
  })
})

describe('templateFileIdSchema', () => {
  it.each(['file_abc123', 'file_A1b2C3', 'file_0'])(
    'accepts the storage file id %j',
    (value) => {
      expect(templateFileIdSchema.parse(value)).toBe(value)
    }
  )

  it.each(INVALID_FILE_IDS)('rejects %j', (value) => {
    expect(templateFileIdSchema.safeParse(value).success).toBe(false)
  })
})

describe('documentTemplateSettingsSchema', () => {
  const layoutDocumentTypes = DOCUMENT_TEMPLATE_LAYOUTS.flatMap((layout) =>
    layout.documentTypes.map(
      (documentType) => [layout.key, documentType] as const
    )
  )

  it.each(layoutDocumentTypes)(
    'accepts the %s layout defaults for %s unchanged',
    (layoutKey, documentType) => {
      const defaults = layoutDefaults(layoutKey, documentType)
      expect(documentTemplateSettingsSchema.parse(defaults)).toEqual(defaults)
    }
  )

  it('rejects an unknown key at the top level', () => {
    const defaults = layoutDefaults('standard', 'invoice')
    expect(
      documentTemplateSettingsSchema.safeParse({
        ...defaults,
        unknownSection: {},
      }).success
    ).toBe(false)
  })

  it('rejects an unknown key inside the general section', () => {
    const defaults = layoutDefaults('standard', 'invoice')
    expect(
      documentTemplateSettingsSchema.safeParse({
        ...defaults,
        general: { ...defaults.general, accent: '#1f6feb' },
      }).success
    ).toBe(false)
  })

  it('rejects header content of 2001 characters', () => {
    const defaults = layoutDefaults('standard', 'invoice')
    expect(
      documentTemplateSettingsSchema.safeParse({
        ...defaults,
        header: { ...defaults.header, content: 'x'.repeat(2001) },
      }).success
    ).toBe(false)
  })

  it('accepts header content of exactly 2000 characters', () => {
    const defaults = layoutDefaults('standard', 'invoice')
    const content = 'x'.repeat(2000)
    const parsed = documentTemplateSettingsSchema.parse({
      ...defaults,
      header: { ...defaults.header, content },
    })
    expect(parsed.header.content).toBe(content)
  })

  it('rejects a detail field label longer than 60 characters', () => {
    const defaults = layoutDefaults('standard', 'invoice')
    const fields = defaults.documentDetails.fields.map((field, index) =>
      index === 0 ? { ...field, label: 'L'.repeat(61) } : field
    )
    expect(
      documentTemplateSettingsSchema.safeParse({
        ...defaults,
        documentDetails: { ...defaults.documentDetails, fields },
      }).success
    ).toBe(false)
  })

  it('accepts a detail field label of exactly 60 characters', () => {
    const defaults = layoutDefaults('standard', 'invoice')
    const label = 'L'.repeat(60)
    const fields = defaults.documentDetails.fields.map((field, index) =>
      index === 0 ? { ...field, label } : field
    )
    const parsed = documentTemplateSettingsSchema.parse({
      ...defaults,
      documentDetails: { ...defaults.documentDetails, fields },
    })
    expect(parsed.documentDetails.fields[0]?.label).toBe(label)
  })

  function withGeneralFontSize(fontSize: number) {
    const defaults = layoutDefaults('standard', 'invoice')
    return { ...defaults, general: { ...defaults.general, fontSize } }
  }

  it.each([[5], [37]])('rejects a general font size of %i', (fontSize) => {
    expect(
      documentTemplateSettingsSchema.safeParse(withGeneralFontSize(fontSize))
        .success
    ).toBe(false)
  })

  it.each([[6], [36]])('accepts a general font size of %i', (fontSize) => {
    const parsed = documentTemplateSettingsSchema.parse(
      withGeneralFontSize(fontSize)
    )
    expect(parsed.general.fontSize).toBe(fontSize)
  })
})

describe('documentTemplateOverridesSchema', () => {
  const VALID_OVERRIDES: [unknown][] = [
    [{}],
    [{ general: { paperSize: 'letter' } }],
    [
      {
        table: {
          columns: [
            { key: 'tax', show: true, label: 'GCT', widthPercent: null },
          ],
        },
      },
    ],
  ]

  const INVALID_OVERRIDES: [unknown][] = [
    [{ general: { paperSize: 'a3' } }],
    [{ unknownSection: {} }],
    [{ general: { fontSize: 5 } }],
  ]

  it.each(VALID_OVERRIDES)('accepts %j', (value) => {
    expect(documentTemplateOverridesSchema.parse(value)).toEqual(value)
  })

  it.each(INVALID_OVERRIDES)('rejects %j', (value) => {
    expect(documentTemplateOverridesSchema.safeParse(value).success).toBe(false)
  })
})

describe('document template content is plain text', () => {
  it.each(PLAIN_TEXT_PAYLOADS)(
    'accepts %j in header content byte for byte',
    (payload) => {
      const defaults = layoutDefaults('standard', 'invoice')
      const parsed = documentTemplateSettingsSchema.parse({
        ...defaults,
        header: { ...defaults.header, content: payload },
      })
      expect(parsed.header.content).toBe(payload)
    }
  )
})
