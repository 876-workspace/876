import { describe, expect, it } from 'vitest'
import type { DocumentTemplateSettings } from '@876/core/document-templates'
import {
  layoutDefaults,
  resolveDocumentTemplate,
} from '@876/core/document-templates'

import { diffTemplateSettings } from './template-diff'

function defaults(): DocumentTemplateSettings {
  return layoutDefaults('standard', 'invoice')
}

function edited(mutate: (draft: DocumentTemplateSettings) => void): {
  before: DocumentTemplateSettings
  after: DocumentTemplateSettings
} {
  const before = defaults()
  const after = structuredClone(before)
  mutate(after)
  return { before, after }
}

describe('diffTemplateSettings', () => {
  it('returns no overrides when nothing changed', () => {
    // ARRANGE
    const before = defaults()

    // ACT
    const overrides = diffTemplateSettings(before, structuredClone(before))

    // ASSERT
    expect(overrides).toEqual({})
  })

  it('captures a single scalar field', () => {
    // ARRANGE
    const { before, after } = edited((draft) => {
      draft.general.fontSize = 12
    })

    // ACT
    const overrides = diffTemplateSettings(before, after)

    // ASSERT
    expect(overrides).toEqual({ general: { fontSize: 12 } })
  })

  it('includes the whole nested style object when one of its values changes', () => {
    // ARRANGE
    const { before, after } = edited((draft) => {
      draft.organization.name.fontSize = 14
    })

    // ACT
    const overrides = diffTemplateSettings(before, after)

    // ASSERT
    expect(overrides).toEqual({
      organization: {
        name: { fontSize: 14, fontColor: before.organization.name.fontColor },
      },
    })
  })

  it('includes the whole keyed column list when one entry changes', () => {
    // ARRANGE
    const { before, after } = edited((draft) => {
      const rate = draft.table.columns.find((column) => column.key === 'rate')
      if (rate) rate.show = false
    })

    // ACT
    const overrides = diffTemplateSettings(before, after)

    // ASSERT
    expect(overrides.table?.columns).toHaveLength(before.table.columns.length)
    expect(
      overrides.table?.columns?.find((column) => column.key === 'rate')
    ).toMatchObject({ show: false })
  })

  it('omits sections that did not change', () => {
    // ARRANGE
    const { before, after } = edited((draft) => {
      draft.totals.totalLabel = 'Amount Due'
    })

    // ACT
    const overrides = diffTemplateSettings(before, after)

    // ASSERT
    expect(Object.keys(overrides)).toEqual(['totals'])
  })

  it('captures a nulled accent color', () => {
    // ARRANGE
    const { before, after } = edited((draft) => {
      draft.general.accentColor = '#e11d48'
    })

    // ACT
    const overrides = diffTemplateSettings(before, after)

    // ASSERT
    expect(overrides).toEqual({ general: { accentColor: '#e11d48' } })
  })

  it.each([
    [
      'title text and style',
      (draft: DocumentTemplateSettings) => {
        draft.documentDetails.title = 'Tax Invoice'
        draft.documentDetails.titleStyle = {
          fontSize: 24,
          fontColor: '#1e293b',
        }
      },
    ],
    [
      'column visibility, label and width',
      (draft: DocumentTemplateSettings) => {
        for (const column of draft.table.columns) {
          if (column.key === 'unit') column.show = true
          if (column.key === 'rate') column.label = 'Price'
          if (column.key === 'amount') column.widthPercent = 20
        }
        draft.table.showBorders = true
      },
    ],
    [
      'totals flags and labels',
      (draft: DocumentTemplateSettings) => {
        draft.totals.showAmountInWords = true
        draft.totals.showTaxSummary = true
        draft.totals.totalLabel = 'Amount Due'
        draft.totals.balanceDueStyle = {
          fontSize: 12,
          fontColor: '#ffffff',
          backgroundColor: '#1e293b',
        }
      },
    ],
    [
      'notes, terms and signature',
      (draft: DocumentTemplateSettings) => {
        draft.otherDetails.notes.label = 'Delivery notes'
        draft.otherDetails.terms.show = false
        draft.otherDetails.signature.show = true
        draft.otherDetails.signature.label = 'Approved by'
      },
    ],
    [
      'paper, margins and accent',
      (draft: DocumentTemplateSettings) => {
        draft.general.paperSize = 'letter'
        draft.general.orientation = 'landscape'
        draft.general.margins = { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }
        draft.general.accentColor = '#0d9488'
      },
    ],
  ])('round-trips through the resolver: %s', (_label, mutate) => {
    // ARRANGE
    const { before, after } = edited(mutate)

    // ACT
    const resolved = resolveDocumentTemplate(
      'standard',
      'invoice',
      diffTemplateSettings(before, after)
    )

    // ASSERT
    expect(resolved).toEqual(after)
  })
})
