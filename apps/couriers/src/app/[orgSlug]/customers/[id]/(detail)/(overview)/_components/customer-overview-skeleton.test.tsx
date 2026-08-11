/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CustomerOverviewSkeleton } from './customer-overview-skeleton'

describe('CustomerOverviewSkeleton', () => {
  it('renders two cards in a responsive grid', () => {
    const { container } = render(<CustomerOverviewSkeleton />)
    const grid = container.firstChild as HTMLElement
    expect(grid).toHaveClass('grid')
    expect(grid).toHaveClass('gap-5')
    // two card skeletons
    const cards = container.querySelectorAll('section')
    expect(cards).toHaveLength(2)
    for (const card of cards) {
      expect(card).toHaveClass('876-card')
    }
  })

  it('each card has a title skeleton and four line skeletons', () => {
    const { container } = render(<CustomerOverviewSkeleton />)
    const cards = container.querySelectorAll('section')
    for (const card of cards) {
      const skeletons = card.querySelectorAll('[data-slot="skeleton"]')
      // 1 title + 4 lines = 5
      expect(skeletons).toHaveLength(5)
    }
    // titles are shorter than lines
    const allSkeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(allSkeletons).toHaveLength(10)
  })

  it('is accessible as loading state — no headings or interactive elements', () => {
    render(<CustomerOverviewSkeleton />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('applies pulse animation to skeletons', () => {
    const { container } = render(<CustomerOverviewSkeleton />)
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    for (const el of skeletons) {
      expect(el.className).toMatch(/animate-pulse/)
    }
  })
})
