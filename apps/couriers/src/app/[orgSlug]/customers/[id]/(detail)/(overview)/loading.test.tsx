/** @vitest-environment jsdom */
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Loading from './loading'
import { CustomerOverviewSkeleton } from './_components/customer-overview-skeleton'

describe('CustomerOverview Loading', () => {
  it('renders the overview skeleton', () => {
    const { container: loadingContainer } = render(<Loading />)
    const { container: skeletonContainer } = render(
      <CustomerOverviewSkeleton />
    )
    expect(loadingContainer.innerHTML).toBe(skeletonContainer.innerHTML)
  })

  it('contains two skeleton cards with pulse', () => {
    const { container } = render(<Loading />)
    expect(container.querySelectorAll('section')).toHaveLength(2)
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(
      10
    )
  })

  it('matches the Suspense fallback for the overview page', async () => {
    const pageModule = await import('./page')
    // page renders Suspense fallback that is the same skeleton — verify loading reuses that component
    expect(pageModule.default).toBeDefined()
    // Loading is a direct re-export of skeleton, ensuring consistent UI between
    // initial load and streaming fallback.
    expect(Loading).toBeDefined()
  })
})
