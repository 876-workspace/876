/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import ManifestDetailLayout, { generateMetadata } from './layout'

const params = Promise.resolve({ orgSlug: 'island-logistics', id: 'mnf_1' })

describe('ManifestDetailLayout', () => {
  it('renders the manifest id in the card header', async () => {
    render(
      await ManifestDetailLayout({
        children: <div data-testid="detail-body" />,
        params,
      })
    )

    expect(screen.getByRole('heading', { name: 'mnf_1' })).toBeVisible()
    expect(screen.getByTestId('detail-body')).toBeInTheDocument()
  })

  it('closes back to the manifest list', async () => {
    render(
      await ManifestDetailLayout({
        children: <div data-testid="detail-body" />,
        params,
      })
    )

    expect(
      screen.getByRole('link', { name: 'Close manifest details' })
    ).toHaveAttribute('href', '/island-logistics/packages/manifest')
  })

  it('titles the document with the manifest id', async () => {
    await expect(
      generateMetadata({ params, children: undefined })
    ).resolves.toEqual({
      title: 'mnf_1 - Manifests',
    })
  })
})
