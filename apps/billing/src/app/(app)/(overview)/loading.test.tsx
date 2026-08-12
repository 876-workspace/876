/** @vitest-environment jsdom */

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Loading from './loading'
import { BillingDashboardSkeleton } from '@/components/patterns/billing-page-skeleton'

describe('Overview Loading', () => {
  it('renders BillingDashboardSkeleton', () => {
    const { container: a } = render(<Loading />)
    const { container: b } = render(<BillingDashboardSkeleton />)
    expect(a.innerHTML).toBe(b.innerHTML)
  })

  it('contains 4 metric skeletons', () => {
    const { container } = render(<Loading />)
    expect(container.querySelectorAll('[class~="876-card"]').length).toBe(6)
  })

  it('has no interactive elements', () => {
    const { container } = render(<Loading />)
    expect(container.querySelectorAll('button').length).toBe(0)
    expect(container.querySelectorAll('a').length).toBe(0)
  })
})
