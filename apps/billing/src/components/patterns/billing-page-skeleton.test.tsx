/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  BillingDashboardSkeleton,
  BillingListPageSkeleton,
} from './billing-page-skeleton'

describe('BillingListPageSkeleton', () => {
  it('renders 4 column headers matching expected labels', () => {
    const { container } = render(<BillingListPageSkeleton />)
    const headers = Array.from(container.querySelectorAll('th')).map((th) =>
      th.textContent?.trim()
    )
    expect(headers).toEqual(['Record', 'Details', 'Status', 'Updated'])
  })

  it('uses avatar cell for Record and badge for Status', () => {
    const { container } = render(<BillingListPageSkeleton />)
    // avatar column creates two skeletons in first cell, badge creates pill
    const rows = container.querySelectorAll('tbody tr')
    expect(rows.length).toBeGreaterThan(0)
    // first row, first cell should contain two skeleton divs (avatar)
    const firstRowCells = rows[0]?.querySelectorAll('td')
    const firstCellSkeletons = firstRowCells?.[0]?.querySelectorAll(
      '[data-slot="skeleton"]'
    )
    expect(firstCellSkeletons?.length).toBe(2)
    const statusCellSkeletons = firstRowCells?.[2]?.querySelectorAll(
      '[data-slot="skeleton"]'
    )
    expect(statusCellSkeletons?.length).toBe(1)
    // badge cell has h-5 class
    expect(statusCellSkeletons?.[0]?.className).toContain('h-5')
  })

  it('renders table container aria-hidden and no interactive elements', () => {
    const { container } = render(<BillingListPageSkeleton />)
    const tableContainer = container.querySelector(
      '[data-slot="table-container"]'
    )
    expect(tableContainer).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelectorAll('button').length).toBe(0)
    expect(container.querySelectorAll('a').length).toBe(0)
    expect(container.querySelectorAll('input').length).toBe(0)
  })

  it('renders top bar skeletons with expected sizes', () => {
    const { container } = render(<BillingListPageSkeleton />)
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    // header skeletons + table skeletons
    expect(skeletons.length).toBeGreaterThan(5)
    // check specific header skeleton classes
    const headerSkeletons = container.querySelectorAll(
      '.h-7.w-36, .h-4.w-24, .h-9.w-24'
    )
    expect(headerSkeletons.length).toBe(3)
  })

  it('renders identical output on repeated renders', () => {
    const { container: a } = render(<BillingListPageSkeleton />)
    const { container: b } = render(<BillingListPageSkeleton />)
    expect(a.innerHTML).toBe(b.innerHTML)
    expect(a.querySelectorAll('tbody tr').length).toBe(
      b.querySelectorAll('tbody tr').length
    )
  })

  it('caps loading rows at 5 (default)', () => {
    const { container } = render(<BillingListPageSkeleton />)
    expect(container.querySelectorAll('tbody tr').length).toBe(5)
  })

  it('wraps in Page with no heading duplication', () => {
    render(<BillingListPageSkeleton />)
    // should not have real h1 title, only skeletons
    expect(screen.queryByRole('heading')).toBeNull()
  })
})

describe('BillingDashboardSkeleton', () => {
  it('renders 4 metric cards and 2 detail cards', () => {
    const { container } = render(<BillingDashboardSkeleton />)
    const metricCards = container.querySelectorAll(
      '.grid.gap-4.sm\\:grid-cols-2 > div'
    )
    // first grid = 4 cards
    expect(metricCards.length).toBe(4)
    const detailCards = container.querySelectorAll('.mt-6.grid > div')
    expect(detailCards.length).toBe(2)
  })

  it('contains expected skeleton sizes for headings', () => {
    const { container } = render(<BillingDashboardSkeleton />)
    expect(container.querySelector('.h-3.w-32')).toBeTruthy()
    expect(container.querySelector('.h-9.w-44')).toBeTruthy()
    expect(container.querySelector('.h-5.w-96')).toBeTruthy()
  })

  it('renders no interactive elements and no buttons', () => {
    const { container } = render(<BillingDashboardSkeleton />)
    expect(container.querySelectorAll('button').length).toBe(0)
    expect(container.querySelectorAll('a').length).toBe(0)
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length
    ).toBeGreaterThan(10)
  })

  it('has 876-card surfaces for each placeholder card', () => {
    const { container } = render(<BillingDashboardSkeleton />)
    const cards = container.querySelectorAll('[class~="876-card"]')
    expect(cards.length).toBe(6) // 4 + 2
    cards.forEach((card) => {
      expect(
        card.querySelectorAll('[data-slot="skeleton"]').length
      ).toBeGreaterThan(0)
    })
  })

  it('renders identical output on repeated renders', () => {
    const { container: a } = render(<BillingDashboardSkeleton />)
    const { container: b } = render(<BillingDashboardSkeleton />)
    expect(a.innerHTML).toBe(b.innerHTML)
  })

  it('uses pb-12 on Page wrapper', () => {
    const { container } = render(<BillingDashboardSkeleton />)
    const page = container.querySelector('[data-slot="page"]')
    expect(page?.className).toContain('pb-12')
  })
})
