/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import DeliveryDetailLayout, { generateMetadata } from './layout'

const params = Promise.resolve({ orgSlug: 'island-logistics', id: 'dlv_1' })

describe('DeliveryDetailLayout', () => {
  it('renders the delivery id in the card header', async () => {
    render(
      await DeliveryDetailLayout({
        children: <div data-testid="detail-body" />,
        params,
      })
    )

    expect(screen.getByRole('heading', { name: 'dlv_1' })).toBeVisible()
    expect(screen.getByTestId('detail-body')).toBeInTheDocument()
  })

  it('closes back to the deliveries list', async () => {
    render(
      await DeliveryDetailLayout({
        children: <div data-testid="detail-body" />,
        params,
      })
    )

    expect(
      screen.getByRole('link', { name: 'Close delivery details' })
    ).toHaveAttribute('href', '/island-logistics/deliveries')
  })

  it('titles the document with the delivery id', async () => {
    await expect(
      generateMetadata({ params, children: undefined })
    ).resolves.toEqual({
      title: 'dlv_1 - Deliveries',
    })
  })
})
