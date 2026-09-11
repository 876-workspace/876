/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { InvoiceOriginLink } from './invoice-origin-link'

describe('InvoiceOriginLink', () => {
  it('links the generated invoice to its recurring schedule', () => {
    // ARRANGE — no state needed; the link is fully described by props.

    // ACT
    render(<InvoiceOriginLink profileId="rinv_1" profileName="Retainer" />)

    // ASSERT
    expect(screen.getByText('Generated from', { exact: false })).toBeVisible()
    const link = screen.getByRole('link', { name: 'Retainer' })
    expect(link.getAttribute('href')).toBe('/recurring-invoices/rinv_1')

    // AFTER — testing-library performs cleanup.
  })
})
