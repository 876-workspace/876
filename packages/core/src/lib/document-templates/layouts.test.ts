import { describe, expect, it } from 'vitest'

import {
  DEFAULT_DOCUMENT_TEMPLATE_LAYOUT,
  DOCUMENT_TEMPLATE_LAYOUTS,
  findDocumentTemplateLayout,
  layoutDefaults,
  layoutSupportsDocumentType,
} from './layouts'
import {
  DOCUMENT_TEMPLATE_LAYOUT_KEYS,
  DOCUMENT_TEMPLATE_TYPES,
} from './schema'

const INVOICE_DETAIL_FIELD_KEYS = [
  'number',
  'date',
  'terms',
  'due-date',
  'reference',
  'salesperson',
  'subject',
]

describe('layout gallery', () => {
  it('declares exactly the layout keys the schema allows', () => {
    expect(DOCUMENT_TEMPLATE_LAYOUTS.map((layout) => layout.key)).toEqual([
      ...DOCUMENT_TEMPLATE_LAYOUT_KEYS,
    ])
  })

  it('declares each layout key at most once', () => {
    const keys = DOCUMENT_TEMPLATE_LAYOUTS.map((layout) => layout.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it.each(DOCUMENT_TEMPLATE_LAYOUTS)(
    'the $key layout supports at least one document type',
    (layout) => {
      expect(layout.documentTypes.length).toBeGreaterThan(0)
    }
  )

  it.each([...DOCUMENT_TEMPLATE_TYPES])(
    'the %s document type is supported by at least one layout',
    (documentType) => {
      expect(
        DOCUMENT_TEMPLATE_LAYOUTS.some((layout) =>
          layoutSupportsDocumentType(layout.key, documentType)
        )
      ).toBe(true)
    }
  )

  it.each([...DOCUMENT_TEMPLATE_TYPES])(
    'the %s document type is supported by the default layout',
    (documentType) => {
      expect(
        layoutSupportsDocumentType(
          DEFAULT_DOCUMENT_TEMPLATE_LAYOUT,
          documentType
        )
      ).toBe(true)
    }
  )
})

describe('findDocumentTemplateLayout', () => {
  it('returns undefined for a key that is not in the gallery', () => {
    expect(findDocumentTemplateLayout('nope')).toBeUndefined()
  })

  it('returns the retail entry in full', () => {
    expect(findDocumentTemplateLayout('retail')).toEqual({
      key: 'retail',
      label: 'Retail receipt',
      category: 'retail',
      documentTypes: ['sales-receipt', 'payment-receipt'],
    })
  })
})

describe('layoutSupportsDocumentType', () => {
  it('reports retail as not supporting invoices', () => {
    expect(layoutSupportsDocumentType('retail', 'invoice')).toBe(false)
  })

  it('reports retail as supporting sales receipts', () => {
    expect(layoutSupportsDocumentType('retail', 'sales-receipt')).toBe(true)
  })
})

describe('layoutDefaults document titles and labels', () => {
  it('titles an invoice template INVOICE', () => {
    expect(layoutDefaults('standard', 'invoice').documentDetails.title).toBe(
      'INVOICE'
    )
  })

  it('titles a quote template QUOTE', () => {
    expect(layoutDefaults('standard', 'quote').documentDetails.title).toBe(
      'QUOTE'
    )
  })

  it('labels the payment receipt party Received From', () => {
    expect(
      layoutDefaults('standard', 'payment-receipt').customer.billToLabel
    ).toBe('Received From')
  })
})

describe('layoutDefaults detail fields', () => {
  it('lists the invoice detail fields in order', () => {
    expect(
      layoutDefaults('standard', 'invoice').documentDetails.fields.map(
        (field) => field.key
      )
    ).toEqual(INVOICE_DETAIL_FIELD_KEYS)
  })
})

describe('retail layout defaults', () => {
  it('uses the 80mm receipt paper size', () => {
    expect(layoutDefaults('retail', 'sales-receipt').general.paperSize).toBe(
      'receipt-80mm'
    )
  })

  it('shows exactly the item, quantity and amount columns', () => {
    const visible = layoutDefaults('retail', 'sales-receipt')
      .table.columns.filter((column) => column.show)
      .map((column) => column.key)
    expect(visible).toEqual(['item', 'quantity', 'amount'])
  })
})

describe('layoutDefaults immutability', () => {
  it('returns a deep-equal but distinct object graph on every call', () => {
    const first = layoutDefaults('standard', 'invoice')
    const second = layoutDefaults('standard', 'invoice')
    expect(first).toEqual(second)
    expect(first).not.toBe(second)
    expect(first.general).not.toBe(second.general)
    expect(first.general.margins).not.toBe(second.general.margins)
    expect(first.table.columns[0]).not.toBe(second.table.columns[0])
  })

  it('does not leak a caller mutation into the next call', () => {
    const first = layoutDefaults('standard', 'invoice')
    first.general.margins.top = 1.9
    const second = layoutDefaults('standard', 'invoice')
    expect(second.general.margins.top).toBe(0.7)
  })
})
