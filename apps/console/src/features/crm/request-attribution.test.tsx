// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'

import {
  RelatedResourceMetadata,
  SourceAppMetadata,
  relatedResourceLabel,
  sourceAppName,
} from './request-attribution'

afterEach(cleanup)

describe('request attribution metadata', () => {
  it('maps every service slug to its product name', () => {
    expect(sourceAppName('876-invoice')).toBe('876 Invoice')
    expect(sourceAppName('876-billing')).toBe('876 Billing')
    expect(sourceAppName('876-crm')).toBe('876 CRM')
    expect(sourceAppName('876-console')).toBe('876 Console')
  })

  it('renders an em dash with muted styling for a missing source app', () => {
    render(<SourceAppMetadata sourceApp={null} />)

    expect(screen.getByText('—')).toHaveClass('text-muted-foreground')
  })

  it('uses the related record snapshot number when available', () => {
    expect(
      relatedResourceLabel({
        type: 'invoice',
        id: 'inv_1',
        snapshot: { number: 'INV-1042' },
      })
    ).toBe('Invoice INV-1042')
  })

  it('falls back to the related record id when its snapshot has no number', () => {
    render(
      <RelatedResourceMetadata
        type="payment"
        id="pay_1"
        snapshot={{ amount: '1099', currency: 'USD' }}
      />
    )

    expect(screen.getByText('Payment pay_1')).toHaveClass(
      'text-muted-foreground'
    )
  })

  it('renders an em dash for an absent related record', () => {
    render(<RelatedResourceMetadata type={null} id={null} snapshot={null} />)

    expect(screen.getByText('—')).toHaveClass('text-muted-foreground')
  })
})
