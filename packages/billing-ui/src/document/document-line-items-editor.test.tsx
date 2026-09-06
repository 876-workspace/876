import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { formatMinorUnits } from '@876/core/money'

import {
  DocumentLineItemsEditor,
  type DocumentLineDraft,
} from './document-line-items-editor'

function draft(overrides: Partial<DocumentLineDraft> = {}): DocumentLineDraft {
  return {
    id: 'line-1',
    description: 'Consulting retainer',
    quantity: '2',
    unitAmount: '1500.00',
    ...overrides,
  }
}

const formatAmount = (minorUnits: bigint) => `J$${formatMinorUnits(minorUnits)}`

function renderEditor(
  props: Partial<Parameters<typeof DocumentLineItemsEditor>[0]> = {}
) {
  const onChange = vi.fn()
  const utils = render(
    <DocumentLineItemsEditor
      lines={[draft()]}
      onChange={onChange}
      formatAmount={formatAmount}
      {...props}
    />
  )
  return { onChange, ...utils }
}

describe('DocumentLineItemsEditor', () => {
  describe('totals', () => {
    it('renders the line total as rate times quantity', () => {
      renderEditor()
      expect(screen.getByTestId('line-total-0')).toHaveTextContent('J$3000.00')
    })

    it('renders subtotal, tax and total for a plain line', () => {
      renderEditor()
      expect(screen.getByTestId('total-subtotal')).toHaveTextContent(
        'J$3000.00'
      )
      expect(screen.getByTestId('total-tax')).toHaveTextContent('J$0.00')
      expect(screen.getByTestId('total-total')).toHaveTextContent('J$3000.00')
    })

    it('adds line tax and subtracts line discount', () => {
      renderEditor({
        lines: [draft({ taxAmount: '450.00', discountAmount: '300.00' })],
      })
      expect(screen.getByTestId('line-total-0')).toHaveTextContent('J$3150.00')
    })

    it('folds document discount, shipping and adjustment into the total', () => {
      renderEditor({
        discountAmount: 50_000n,
        shippingAmount: 25_000n,
        adjustmentAmount: -1_000n,
      })
      // 300000 - 50000 + 25000 - 1000
      expect(screen.getByTestId('total-total')).toHaveTextContent('J$2740.00')
    })

    it('sums several lines', () => {
      renderEditor({
        lines: [
          draft(),
          draft({ id: 'line-2', quantity: '1', unitAmount: '500.00' }),
        ],
      })
      expect(screen.getByTestId('total-subtotal')).toHaveTextContent(
        'J$3500.00'
      )
    })

    it('carries an amount a float would round wrongly', () => {
      renderEditor({ lines: [draft({ quantity: '1', unitAmount: '1500.07' })] })
      expect(screen.getByTestId('line-total-0')).toHaveTextContent('J$1500.07')
    })

    it('treats a blank rate as zero so a half-typed row still shows a total', () => {
      renderEditor({ lines: [draft({ unitAmount: '' })] })
      expect(screen.getByTestId('total-total')).toHaveTextContent('J$0.00')
    })

    it('treats an unparseable rate as zero rather than crashing', () => {
      renderEditor({ lines: [draft({ unitAmount: '1.234' })] })
      expect(screen.getByTestId('total-total')).toHaveTextContent('J$0.00')
    })

    it('treats a fractional quantity as zero rather than throwing on BigInt', () => {
      renderEditor({ lines: [draft({ quantity: '1.5' })] })
      expect(screen.getByTestId('total-total')).toHaveTextContent('J$0.00')
    })

    it('honours a zero-decimal currency', () => {
      renderEditor({
        minorUnitDigits: 0,
        lines: [draft({ quantity: '2', unitAmount: '1500' })],
        formatAmount: (minorUnits) => `¥${formatMinorUnits(minorUnits, 0)}`,
      })
      expect(screen.getByTestId('total-total')).toHaveTextContent('¥3000')
    })

    it('renders an empty document with zero totals and no rows', () => {
      renderEditor({ lines: [] })
      expect(screen.getByTestId('total-total')).toHaveTextContent('J$0.00')
      expect(screen.queryByTestId('line-total-0')).not.toBeInTheDocument()
    })
  })

  describe('invariants', () => {
    it('shows the line-discount failure instead of a total', () => {
      renderEditor({
        lines: [
          draft({
            quantity: '1',
            unitAmount: '100.00',
            discountAmount: '200.00',
          }),
        ],
      })
      expect(screen.getByRole('alert')).toHaveTextContent(
        'A line discount cannot exceed the line subtotal.'
      )
      expect(screen.getByTestId('total-total')).toHaveTextContent('—')
    })

    it('shows the document-discount failure', () => {
      renderEditor({ discountAmount: 999_999_999n })
      expect(screen.getByRole('alert')).toHaveTextContent(
        'The document discount cannot exceed its subtotal.'
      )
    })

    it('shows the negative-total failure', () => {
      renderEditor({ adjustmentAmount: -999_999_999n })
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Document adjustments cannot produce a negative total.'
      )
    })

    it('renders no alert when the document is valid', () => {
      renderEditor()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('editing', () => {
    it('reports a description edit with the full line list', async () => {
      const user = userEvent.setup()
      const { onChange } = renderEditor()

      await user.type(screen.getByLabelText('Line 1 description'), '!')

      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith([
        { ...draft(), description: 'Consulting retainer!' },
      ])
    })

    it('appends an empty line when Add line is used', async () => {
      const user = userEvent.setup()
      const { onChange } = renderEditor()

      await user.click(screen.getByRole('button', { name: /add line/i }))

      expect(onChange).toHaveBeenCalledTimes(1)
      const next = onChange.mock.calls[0]?.[0] as DocumentLineDraft[]
      expect(next).toHaveLength(2)
      expect(next[1]).toMatchObject({
        description: '',
        quantity: '1',
        unitAmount: '',
      })
    })

    it('removes the row that was acted on', async () => {
      const user = userEvent.setup()
      const { onChange } = renderEditor({
        lines: [draft(), draft({ id: 'line-2', description: 'Hosting' })],
      })

      await user.click(screen.getByRole('button', { name: 'Remove line 1' }))

      expect(onChange).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'line-2' }),
      ])
    })

    it('gives every input an accessible name', () => {
      renderEditor()
      for (const label of [
        'description',
        'quantity',
        'rate',
        'discount',
        'tax',
      ]) {
        expect(screen.getByLabelText(`Line 1 ${label}`)).toBeInTheDocument()
      }
    })
  })

  describe('read-only', () => {
    it('disables every input', () => {
      renderEditor({ readOnly: true })
      expect(screen.getByLabelText('Line 1 description')).toBeDisabled()
      expect(screen.getByLabelText('Line 1 rate')).toBeDisabled()
    })

    it('hides Add line and Remove', () => {
      renderEditor({ readOnly: true })
      expect(
        screen.queryByRole('button', { name: /add line/i })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /remove line/i })
      ).not.toBeInTheDocument()
    })

    it('still renders totals', () => {
      renderEditor({ readOnly: true })
      expect(screen.getByTestId('total-total')).toHaveTextContent('J$3000.00')
    })
  })

  describe('slots', () => {
    it('renders an extra column header and cell', () => {
      renderEditor({
        extraColumns: [
          {
            key: 'period',
            header: 'Period',
            render: (line) => <span>{line.id}-period</span>,
          },
        ],
      })
      expect(screen.getByText('Period')).toBeInTheDocument()
      expect(screen.getByText('line-1-period')).toBeInTheDocument()
    })

    it('renders row actions beside remove', () => {
      renderEditor({
        renderRowActions: (line) => (
          <button type="button">Duplicate {line.id}</button>
        ),
      })
      expect(
        screen.getByRole('button', { name: 'Duplicate line-1' })
      ).toBeInTheDocument()
    })

    it('renders the footer slot', () => {
      renderEditor({ footer: <p>Payment due in 30 days</p> })
      expect(screen.getByText('Payment due in 30 days')).toBeInTheDocument()
    })

    it('renders no extra columns when none are supplied', () => {
      renderEditor()
      expect(screen.queryByText('Period')).not.toBeInTheDocument()
    })
  })

  describe('totals reporting', () => {
    it('reports a ready snapshot to the host', () => {
      const onTotalsChange = vi.fn()
      renderEditor({ onTotalsChange })

      expect(onTotalsChange).toHaveBeenCalledTimes(1)
      expect(onTotalsChange.mock.calls[0]?.[0]).toMatchObject({
        status: 'ready',
        totals: expect.objectContaining({ totalAmount: 300_000n }),
      })
    })

    it('reports an invalid snapshot with the offending line index', () => {
      const onTotalsChange = vi.fn()
      renderEditor({
        onTotalsChange,
        lines: [
          draft({
            quantity: '1',
            unitAmount: '100.00',
            discountAmount: '200.00',
          }),
        ],
      })

      expect(onTotalsChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'invalid', lineIndex: 0 })
      )
    })
  })
})

describe('DocumentLineItemsEditor — catalogue and percentage discount', () => {
  const items = [
    {
      value: 'price:price_1',
      label: 'Consulting hour',
      itemId: 'item_1',
      priceId: 'price_1',
      defaultAmount: '250.00',
      currency: 'JMD',
    },
    {
      value: 'item:item_2',
      label: 'Setup fee',
      itemId: 'item_2',
      priceId: null,
      defaultAmount: '1000.00',
      currency: 'JMD',
    },
  ]

  describe('percentage discount', () => {
    it('resolves a percentage against the line subtotal', () => {
      renderEditor({
        allowPercentageDiscount: true,
        lines: [draft({ discountAmount: '10', discountType: 'PERCENTAGE' })],
      })
      // 2 x 1500.00 = 3000.00, less 10% = 2700.00
      expect(screen.getByTestId('line-total-0')).toHaveTextContent('J$2700.00')
    })

    it('resolves a fractional percentage through basis points', () => {
      renderEditor({
        allowPercentageDiscount: true,
        lines: [draft({ discountAmount: '12.5', discountType: 'PERCENTAGE' })],
      })
      // 3000.00 x 1250bp / 10000 = 375.00 off
      expect(screen.getByTestId('line-total-0')).toHaveTextContent('J$2625.00')
    })

    it('treats the same typed value as money when the type is AMOUNT', () => {
      renderEditor({
        allowPercentageDiscount: true,
        lines: [draft({ discountAmount: '10', discountType: 'AMOUNT' })],
      })
      expect(screen.getByTestId('line-total-0')).toHaveTextContent('J$2990.00')
    })

    it('reads a negative percentage as no discount', () => {
      renderEditor({
        allowPercentageDiscount: true,
        lines: [draft({ discountAmount: '-10', discountType: 'PERCENTAGE' })],
      })
      expect(screen.getByTestId('line-total-0')).toHaveTextContent('J$3000.00')
    })

    it('reports a percentage above 100 as an invalid document', () => {
      renderEditor({
        allowPercentageDiscount: true,
        lines: [draft({ discountAmount: '150', discountType: 'PERCENTAGE' })],
      })
      expect(screen.getByRole('alert')).toHaveTextContent(
        'A line discount cannot exceed the line subtotal.'
      )
    })

    it('does not render the type toggle unless percentages are allowed', () => {
      renderEditor({ lines: [draft()] })
      expect(
        screen.queryByLabelText('Line 1 discount type')
      ).not.toBeInTheDocument()
    })

    it('renders the type toggle when percentages are allowed', () => {
      renderEditor({ allowPercentageDiscount: true })
      expect(screen.getByLabelText('Line 1 discount type')).toBeInTheDocument()
    })
  })

  describe('server-resolved subtotal', () => {
    it('uses the resolved subtotal instead of quantity times rate', () => {
      renderEditor({
        lines: [draft({ resolvedSubtotal: '2400.00', priceId: 'price_1' })],
      })
      expect(screen.getByTestId('line-total-0')).toHaveTextContent('J$2400.00')
    })

    it('falls back to quantity times rate when no resolution has landed', () => {
      renderEditor({
        lines: [draft({ resolvedSubtotal: null, priceId: 'price_1' })],
      })
      expect(screen.getByTestId('line-total-0')).toHaveTextContent('J$3000.00')
    })

    it('takes a percentage discount against the resolved subtotal', () => {
      renderEditor({
        allowPercentageDiscount: true,
        lines: [
          draft({
            resolvedSubtotal: '2400.00',
            discountAmount: '25',
            discountType: 'PERCENTAGE',
          }),
        ],
      })
      expect(screen.getByTestId('line-total-0')).toHaveTextContent('J$1800.00')
    })
  })

  describe('catalogue selection', () => {
    it('renders no item column when no catalogue is supplied', () => {
      renderEditor()
      expect(screen.queryByLabelText('Line 1 item')).not.toBeInTheDocument()
    })

    it('renders the item column when a catalogue is supplied', () => {
      renderEditor({ items })
      expect(screen.getByLabelText('Line 1 item')).toBeInTheDocument()
    })

    it('fills description, item, price and rate from the chosen entry', async () => {
      const user = userEvent.setup()
      const { onChange } = renderEditor({ items })

      await user.selectOptions(
        screen.getByLabelText('Line 1 item'),
        'price:price_1'
      )

      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange.mock.calls[0]?.[0]).toEqual([
        {
          id: 'line-1',
          selectionId: 'price:price_1',
          itemId: 'item_1',
          priceId: 'price_1',
          resolvedSubtotal: null,
          description: 'Consulting hour',
          quantity: '2',
          unitAmount: '250.00',
        },
      ])
    })

    it('clears the item link when the custom-line option is chosen', async () => {
      const user = userEvent.setup()
      const { onChange } = renderEditor({
        items,
        lines: [
          draft({
            selectionId: 'price:price_1',
            itemId: 'item_1',
            priceId: 'price_1',
          }),
        ],
      })

      await user.selectOptions(screen.getByLabelText('Line 1 item'), '')

      expect(onChange.mock.calls[0]?.[0]?.[0]).toMatchObject({
        selectionId: '',
        itemId: null,
        priceId: null,
        resolvedSubtotal: null,
      })
    })

    it('locks the rate of a price-list line so the server prices it', () => {
      renderEditor({
        items,
        priceListActive: true,
        lines: [draft({ priceId: 'price_1' })],
      })
      expect(screen.getByLabelText('Line 1 rate')).toBeDisabled()
    })

    it('leaves a custom line editable while a price list is active', () => {
      renderEditor({
        items,
        priceListActive: true,
        lines: [draft({ priceId: null })],
      })
      expect(screen.getByLabelText('Line 1 rate')).toBeEnabled()
    })

    it('discards a stale resolution when the rate is edited by hand', async () => {
      const user = userEvent.setup()
      const { onChange } = renderEditor({
        lines: [draft({ unitAmount: '', resolvedSubtotal: '2400.00' })],
      })

      await user.type(screen.getByLabelText('Line 1 rate'), '9')

      expect(onChange.mock.calls[0]?.[0]?.[0]).toMatchObject({
        unitAmount: '9',
        resolvedSubtotal: null,
      })
    })
  })
})
