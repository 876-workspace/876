/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  AppLogoChip,
  getAppColorClass,
} from '@/components/patterns/app-logo-chip'

describe('AppLogoChip', () => {
  it('returns the same color for the same app key across calls', () => {
    const color = getAppColorClass('billing')

    expect(getAppColorClass('billing')).toBe(color)
    expect(getAppColorClass('billing')).toBe(color)
  })

  it('normalizes app keys before choosing a color', () => {
    expect(getAppColorClass(' Billing ')).toBe(getAppColorClass('billing'))
    expect(getAppColorClass('BILLING')).toBe(getAppColorClass('billing'))
  })

  it('uses the slug as the shared color identity across surfaces', () => {
    const expectedColor = getAppColorClass('billing')

    render(
      <>
        <AppLogoChip
          appId="app_user_surface"
          slug="billing"
          name="876 Billing"
        />
        <AppLogoChip
          appId="app_org_surface"
          slug="billing"
          name="Billing"
          size="md"
        />
      </>
    )

    const chips = screen.getAllByText('B')
    expect(chips).toHaveLength(2)
    expect(chips[0]).toHaveClass(expectedColor)
    expect(chips[1]).toHaveClass(expectedColor)
  })
})
