/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import PreAlertDetailLayout, { generateMetadata } from './layout'

const params = Promise.resolve({ orgSlug: 'island-logistics', id: 'pa_1' })

describe('PreAlertDetailLayout', () => {
  it('renders the pre-alert id in the card header', async () => {
    render(
      await PreAlertDetailLayout({
        children: <div data-testid="detail-body" />,
        params,
      })
    )

    expect(screen.getByRole('heading', { name: 'pa_1' })).toBeVisible()
    expect(screen.getByTestId('detail-body')).toBeInTheDocument()
  })

  it('closes back to the pre-alerts list', async () => {
    render(
      await PreAlertDetailLayout({
        children: <div data-testid="detail-body" />,
        params,
      })
    )

    expect(
      screen.getByRole('link', { name: 'Close pre-alert details' })
    ).toHaveAttribute('href', '/island-logistics/packages/pre-alerts')
  })

  it('titles the document with the pre-alert id', async () => {
    await expect(
      generateMetadata({ params, children: undefined })
    ).resolves.toEqual({
      title: 'pa_1 - Pre-alerts',
    })
  })
})
