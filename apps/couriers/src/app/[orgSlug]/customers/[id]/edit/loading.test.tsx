/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Loading from './loading'

describe('Edit Customer Loading', () => {
  it('renders edit title and breadcrumb skeleton', () => {
    render(<Loading />)
    expect(
      screen.getByRole('heading', { level: 1, name: /Edit customer/i })
    ).toBeVisible()
    // Page wrapper exists
    expect(
      screen.getByText('Edit customer').closest('[data-slot="page"]')
    ).toBeInTheDocument()
  })

  it('shows three skeletons: breadcrumb, header area and form placeholder', () => {
    const { container } = render(<Loading />)
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons).toHaveLength(2)
    // breadcrumb skeleton
    expect(skeletons[0]!.className).toMatch(/h-4.*w-20/)
    // form skeleton
    expect(skeletons[1]!.className).toMatch(/h-96/)
  })

  it('has no interactive elements while loading', () => {
    render(<Loading />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('preserves page layout spacing', () => {
    const { container } = render(<Loading />)
    const page = container.querySelector('[data-slot="page"]')
    expect(page).toBeInTheDocument()
    const header = container.querySelector('[data-slot="page-header"]')
    expect(header).toHaveClass('mb-8')
  })
})
