/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import PaymentDetailPage from './page'

describe('PaymentDetailPage', () => {
  it('renders nothing because the layout owns the payment card', () => {
    const { container } = render(<PaymentDetailPage />)

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('heading')).toBeNull()
  })
})
