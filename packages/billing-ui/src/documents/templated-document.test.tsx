import { render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'
import { DEFAULT_BRANDING } from '@876/core/branding'
import type {
  DocumentTemplateLayoutKey,
  DocumentTemplateSettings,
} from '@876/core/document-templates'
import { resolveDocumentTemplate } from '@876/core/document-templates'

import { InvoiceDocumentPanel } from '../panels/invoice-document-panel'
import { sampleDocumentFor } from './sample-document'
import { stripCurrencyPrefix, TemplatedDocument } from './templated-document'
import type { TemplatedDocumentData } from './types'

function settings(
  overrides?: (draft: DocumentTemplateSettings) => void,
  layout: DocumentTemplateLayoutKey = 'standard'
): DocumentTemplateSettings {
  const resolved = resolveDocumentTemplate(layout, 'invoice', {})
  const draft = structuredClone(resolved)
  overrides?.(draft)
  return draft
}

function document(): TemplatedDocumentData {
  return sampleDocumentFor('invoice')
}

describe('TemplatedDocument layouts', () => {
  const layouts: DocumentTemplateLayoutKey[] = [
    'standard',
    'european',
    'spreadsheet',
    'elegant',
    'retail',
  ]
  for (const layout of layouts) {
    it(`renders the ${layout} layout`, () => {
      // ARRANGE
      const { container } = render(
        <TemplatedDocument
          documentType="invoice"
          layout={layout}
          settings={settings(undefined, layout)}
          branding={DEFAULT_BRANDING}
          document={document()}
        />
      )

      // ASSERT
      expect(
        container.querySelector(`article[data-layout="${layout}"]`)
      ).not.toBeNull()
      expect(screen.getByText('INVOICE')).toBeInTheDocument()

      // AFTER — testing-library performs cleanup.
    })
  }
})

describe('TemplatedDocument sections', () => {
  it('omits a hidden detail field', () => {
    // ARRANGE
    render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings((draft) => {
          draft.documentDetails.fields = draft.documentDetails.fields.map(
            (field) =>
              field.key === 'date' ? { ...field, show: false } : field
          )
        })}
        branding={DEFAULT_BRANDING}
        document={document()}
      />
    )

    // ASSERT
    expect(screen.queryByText('Invoice Date')).not.toBeInTheDocument()
    expect(screen.getByText('INV-2026-001')).toBeInTheDocument()
  })

  it('shows a renamed detail label', () => {
    // ARRANGE
    render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings((draft) => {
          draft.documentDetails.fields = draft.documentDetails.fields.map(
            (field) =>
              field.key === 'number'
                ? { ...field, label: 'Invoice No.' }
                : field
          )
        })}
        branding={DEFAULT_BRANDING}
        document={document()}
      />
    )

    // ASSERT
    expect(screen.getByText('Invoice No.')).toBeInTheDocument()
  })

  it('renders table columns in configured order', () => {
    // ARRANGE
    const keys = [
      'unit',
      'tax',
      'rate',
      'quantity',
      'line-number',
      'item',
      'discount',
      'amount',
    ] as const
    render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings((draft) => {
          for (const column of draft.table.columns) column.show = true
          draft.table.columns.sort(
            (a, b) => keys.indexOf(a.key) - keys.indexOf(b.key)
          )
        })}
        branding={DEFAULT_BRANDING}
        document={document()}
      />
    )

    // ACT
    const headers = screen
      .getAllByRole('columnheader')
      .map((header) => header.textContent)

    // ASSERT — header order follows the configured column order.
    expect(headers).toEqual([
      'Unit',
      'Tax',
      'Rate',
      'Qty',
      '#',
      'Item & Description',
      'Discount',
      'Amount',
    ])
  })

  it('omits a hidden table column', () => {
    // ARRANGE
    render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings()}
        branding={DEFAULT_BRANDING}
        document={document()}
      />
    )

    // ASSERT — unit is hidden in the standard defaults.
    expect(
      screen.queryByRole('columnheader', { name: 'Unit' })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Item & Description' })
    ).toBeInTheDocument()
  })

  it('suppresses discount and tax columns through the invoice adapter', () => {
    // ARRANGE
    render(
      <InvoiceDocumentPanel
        seller={{ name: '876', countryLabel: 'Jamaica' }}
        recipient={{ name: 'Ada', email: null, phone: null, address: null }}
        meta={[]}
        footer={null}
        invoice={{
          number: 'INV-1',
          status: 'DRAFT',
          subject: null,
          subtotalAmount: '$10.00',
          taxAmount: '$1.00',
          discountAmount: null,
          shippingAmount: null,
          adjustmentAmount: null,
          totalAmount: '$11.00',
          amountCredited: null,
          amountPaid: null,
          amountDue: '$11.00',
          notes: null,
          terms: null,
          lines: [
            {
              id: 'line_1',
              description: 'Consulting',
              quantity: 1,
              servicePeriod: null,
              unitAmount: '$10.00',
              discountAmount: null,
              taxAmount: null,
              totalAmount: '$10.00',
            },
          ],
        }}
      />
    )

    // ASSERT
    expect(
      screen.queryByRole('columnheader', { name: 'Discount' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: 'Tax' })
    ).not.toBeInTheDocument()
  })

  it('substitutes placeholders in header content', () => {
    // ARRANGE
    render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings((draft) => {
          draft.header.show = true
          draft.header.content = 'From %organization.name% — thank you'
        })}
        branding={DEFAULT_BRANDING}
        document={document()}
      />
    )

    // ASSERT
    expect(
      screen.getByText('From Island Fresh Foods Ltd. — thank you')
    ).toBeInTheDocument()
  })

  it('renders the footer page number when enabled', () => {
    // ARRANGE
    render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings()}
        branding={DEFAULT_BRANDING}
        document={document()}
      />
    )

    // ASSERT
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
  })

  it('omits the footer page number when disabled', () => {
    // ARRANGE
    render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings((draft) => {
          draft.footer.content = ''
          draft.footer.showPageNumber = false
        })}
        branding={DEFAULT_BRANDING}
        document={document()}
      />
    )

    // ASSERT
    expect(screen.queryByText('Page 1 of 1')).not.toBeInTheDocument()
  })

  it('hides the logo when the template disables it', () => {
    // ARRANGE
    const data = document()
    data.seller = { ...data.seller, logoUrl: 'https://cdn.876.test/logo.png' }
    const { container } = render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings((draft) => {
          draft.organization.showLogo = false
        })}
        branding={DEFAULT_BRANDING}
        document={data}
      />
    )

    // ASSERT
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  it('shows the configured bill-to label', () => {
    // ARRANGE
    render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings((draft) => {
          draft.customer.billToLabel = 'Billed To'
        })}
        branding={DEFAULT_BRANDING}
        document={document()}
      />
    )

    // ASSERT
    expect(screen.getByText('Billed To')).toBeInTheDocument()
  })

  it('hides the ship-to block by default', () => {
    // ARRANGE
    render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings()}
        branding={DEFAULT_BRANDING}
        document={document()}
      />
    )

    // ASSERT
    expect(screen.queryByText('Ship To')).not.toBeInTheDocument()
  })

  it('hides the totals section when disabled', () => {
    // ARRANGE
    const { container } = render(
      <TemplatedDocument
        documentType="quote"
        layout="standard"
        settings={settings((draft) => {
          draft.totals.show = false
        })}
        branding={DEFAULT_BRANDING}
        document={sampleDocumentFor('quote')}
      />
    )

    // ASSERT — the title-block callout is gone with the quote's null balance,
    // and no totals rows render.
    expect(container.textContent).not.toContain('Sub Total')
    expect(within(container as HTMLElement).queryByText('Total')).toBeNull()
  })

  it('shows payment details when enabled', () => {
    // ARRANGE
    render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings()}
        branding={DEFAULT_BRANDING}
        document={document()}
      />
    )

    // ASSERT
    expect(screen.getByText('Payments received')).toBeInTheDocument()
  })

  it('hides payment details when disabled', () => {
    // ARRANGE
    render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings((draft) => {
          draft.totals.showPaymentDetails = false
        })}
        branding={DEFAULT_BRANDING}
        document={document()}
      />
    )

    // ASSERT
    expect(screen.queryByText('Payments received')).not.toBeInTheDocument()
    expect(screen.queryByText('Credits applied')).not.toBeInTheDocument()
  })

  it('renders the amount in words when enabled', () => {
    // ARRANGE
    render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings((draft) => {
          draft.totals.showAmountInWords = true
        })}
        branding={DEFAULT_BRANDING}
        document={document()}
      />
    )

    // ASSERT
    expect(
      screen.getByText(
        'Two hundred and seventy-seven thousand seven hundred and fifty dollars'
      )
    ).toBeInTheDocument()
  })

  it('renders the tax summary when enabled', () => {
    // ARRANGE
    render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings((draft) => {
          draft.totals.showTaxSummary = true
        })}
        branding={DEFAULT_BRANDING}
        document={document()}
      />
    )

    // ASSERT
    expect(screen.getByText('GCT 15% (15%)')).toBeInTheDocument()
  })

  it('shows configured notes and terms labels', () => {
    // ARRANGE
    render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings((draft) => {
          draft.otherDetails.notes.label = 'Delivery notes'
          draft.otherDetails.terms.label = 'Payment terms'
        })}
        branding={DEFAULT_BRANDING}
        document={document()}
      />
    )

    // ASSERT
    expect(screen.getByText('Delivery notes')).toBeInTheDocument()
    expect(screen.getByText('Payment terms')).toBeInTheDocument()
  })

  it('omits the signature image when no URL is resolved', () => {
    // ARRANGE
    const { container } = render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings((draft) => {
          draft.otherDetails.signature.show = true
          draft.otherDetails.signature.label = 'Signed'
          draft.otherDetails.signature.imageFileId = 'file_sig1'
        })}
        branding={DEFAULT_BRANDING}
        document={document()}
      />
    )

    // ASSERT
    expect(screen.getByText('Signed')).toBeInTheDocument()
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  it('renders the signature image when a URL is resolved', () => {
    // ARRANGE
    render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings((draft) => {
          draft.otherDetails.signature.show = true
          draft.otherDetails.signature.label = 'Signed'
          draft.otherDetails.signature.imageFileId = 'file_sig1'
        })}
        branding={DEFAULT_BRANDING}
        document={document()}
        imageUrls={{ file_sig1: 'https://cdn.876.test/sig.png' }}
      />
    )

    // ASSERT
    expect(screen.getByAltText('Signed')).toHaveAttribute(
      'src',
      'https://cdn.876.test/sig.png'
    )
  })

  it('renders the payment stub for invoices when enabled', () => {
    // ARRANGE
    render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings((draft) => {
          draft.general.includePaymentStub = true
        })}
        branding={DEFAULT_BRANDING}
        document={document()}
      />
    )

    // ASSERT
    expect(screen.getByText(/Amount enclosed/)).toBeInTheDocument()
  })

  it('never renders the payment stub for non-invoice documents', () => {
    // ARRANGE
    render(
      <TemplatedDocument
        documentType="quote"
        layout="standard"
        settings={settings((draft) => {
          draft.general.includePaymentStub = true
        })}
        branding={DEFAULT_BRANDING}
        document={sampleDocumentFor('quote')}
      />
    )

    // ASSERT
    expect(screen.queryByText(/Amount enclosed/)).not.toBeInTheDocument()
  })

  it('exposes the brand accent as a CSS variable on the root', () => {
    // ARRANGE
    const { container } = render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings()}
        branding={DEFAULT_BRANDING}
        document={document()}
      />
    )

    // ACT
    const root = container.querySelector('article') as HTMLElement

    // ASSERT
    expect(root.style.getPropertyValue('--brand-accent')).toBe(
      DEFAULT_BRANDING.accentColor
    )
    expect(root.style.getPropertyValue('--document-accent')).toBe(
      'var(--brand-accent)'
    )
  })

  it('lets the template accent color override the brand', () => {
    // ARRANGE
    const { container } = render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings((draft) => {
          draft.general.accentColor = '#e11d48'
        })}
        branding={DEFAULT_BRANDING}
        document={document()}
      />
    )

    // ASSERT
    const root = container.querySelector('article') as HTMLElement
    expect(root.style.getPropertyValue('--document-accent')).toBe('#e11d48')
  })

  it('renders script text in header content as literal text', () => {
    // ARRANGE
    const { container } = render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings((draft) => {
          draft.header.show = true
          draft.header.content = '<script>alert("header")</script>'
        })}
        branding={DEFAULT_BRANDING}
        document={document()}
      />
    )

    // ASSERT
    expect(
      screen.getByText('<script>alert("header")</script>')
    ).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
  })

  it('renders script text in a line name as literal text', () => {
    // ARRANGE
    const data = document()
    data.lines = [
      {
        ...data.lines[0],
        id: 'line_x',
        name: '<script>alert("line")</script>',
        description: null,
      },
    ]
    const { container } = render(
      <TemplatedDocument
        documentType="invoice"
        layout="standard"
        settings={settings()}
        branding={DEFAULT_BRANDING}
        document={data}
      />
    )

    // ASSERT
    expect(
      screen.getByText('<script>alert("line")</script>')
    ).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
  })
})

describe('stripCurrencyPrefix', () => {
  it('strips a leading alpha currency code', () => {
    expect(stripCurrencyPrefix('JMD 12,500.00')).toBe('12,500.00')
  })

  it('strips a leading currency symbol', () => {
    expect(stripCurrencyPrefix('$10.00')).toBe('10.00')
  })

  it('leaves a bare amount untouched', () => {
    expect(stripCurrencyPrefix('12,500.00')).toBe('12,500.00')
  })
})
