/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import DisputeDetailLayout, { generateMetadata } from './layout'

const params = Promise.resolve({ orgSlug: 'island-logistics', id: 'dsp_1' })

describe('DisputeDetailLayout', () => {
  it('renders the dispute id in the card header', async () => {
    render(
      await DisputeDetailLayout({
        children: <div data-testid="detail-body" />,
        params,
      })
    )

    expect(screen.getByRole('heading', { name: 'dsp_1' })).toBeVisible()
    expect(screen.getByTestId('detail-body')).toBeInTheDocument()
  })

  it('closes back to the disputes list', async () => {
    render(
      await DisputeDetailLayout({
        children: <div data-testid="detail-body" />,
        params,
      })
    )

    expect(
      screen.getByRole('link', { name: 'Close dispute details' })
    ).toHaveAttribute('href', '/island-logistics/disputes')
  })

  it('titles the document with the dispute id', async () => {
    await expect(
      generateMetadata({ params, children: undefined })
    ).resolves.toEqual({
      title: 'dsp_1 - Disputes',
    })
  })
})
