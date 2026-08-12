/** @vitest-environment jsdom */

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DashboardContentSkeleton, DashboardHeader } from './page-skeleton'

describe('dashboard streaming fallback', () => {
  it('renders 4 metric cards and 2 detail cards', () => {
    const { container } = render(<DashboardContentSkeleton />)
    const metricCards = container.querySelectorAll(
      '.grid.gap-4.sm\\:grid-cols-2 > div'
    )
    // first grid = 4 cards
    expect(metricCards.length).toBe(4)
    const detailCards = container.querySelectorAll('.mt-6.grid > div')
    expect(detailCards.length).toBe(2)
  })

  it('keeps the real heading outside the data fallback', () => {
    const { getByRole, getByText } = render(<DashboardHeader />)
    expect(getByRole('heading', { name: 'Dashboard' })).toBeTruthy()
    expect(getByText('Workspace Overview')).toBeTruthy()
  })

  it('renders no interactive elements and no buttons', () => {
    const { container } = render(<DashboardContentSkeleton />)
    expect(container.querySelectorAll('button').length).toBe(0)
    expect(container.querySelectorAll('a').length).toBe(0)
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length
    ).toBeGreaterThan(10)
  })

  it('has 876-card surfaces for each placeholder card', () => {
    const { container } = render(<DashboardContentSkeleton />)
    const cards = container.querySelectorAll('[class~="876-card"]')
    expect(cards.length).toBe(6) // 4 + 2
    cards.forEach((card) => {
      expect(
        card.querySelectorAll('[data-slot="skeleton"]').length
      ).toBeGreaterThan(0)
    })
  })

  it('renders identical output on repeated renders', () => {
    const { container: a } = render(<DashboardContentSkeleton />)
    const { container: b } = render(<DashboardContentSkeleton />)
    expect(a.innerHTML).toBe(b.innerHTML)
  })
})
