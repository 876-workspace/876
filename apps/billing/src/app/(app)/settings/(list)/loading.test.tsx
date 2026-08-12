/** @vitest-environment jsdom */
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Loading from './loading'
import { BillingListPageSkeleton } from '@/components/patterns/billing-page-skeleton'

describe('Settings Loading', () => {
  it('renders BillingListPageSkeleton', () => {
    const { container: a } = render(<Loading />)
    const { container: b } = render(<BillingListPageSkeleton />)
    expect(a.innerHTML).toBe(b.innerHTML)
  })
})
