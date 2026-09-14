/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import AutomationSettingsPage from './page'

describe('Couriers automation settings placeholder', () => {
  it('renders a heading and a coming-soon marker with no way back but the sidebar', async () => {
    render(await AutomationSettingsPage())

    expect(
      screen.getByRole('heading', { level: 1, name: 'Automation' })
    ).toBeVisible()
    expect(screen.getByText('Coming soon.')).toBeVisible()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
