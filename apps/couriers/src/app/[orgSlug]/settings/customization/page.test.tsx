/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import CustomizationSettingsPage from './page'

describe('Couriers customization settings placeholder', () => {
  it('renders a heading and a coming-soon marker with no way back but the sidebar', async () => {
    render(await CustomizationSettingsPage())

    expect(
      screen.getByRole('heading', { level: 1, name: 'Customization' })
    ).toBeVisible()
    expect(screen.getByText('Coming soon.')).toBeVisible()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
