/** @vitest-environment jsdom */

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Loading from './loading'
import {
  DashboardContentSkeleton,
  DashboardHeader,
} from '@/components/patterns/page-skeleton'
import { Page } from '@876/ui/page'

describe('Overview Loading', () => {
  it('matches the streamed dashboard shell and content fallback', () => {
    const { container: a } = render(<Loading />)
    const { container: b } = render(
      <Page className="pb-12">
        <DashboardHeader />
        <DashboardContentSkeleton />
      </Page>
    )
    expect(a.innerHTML).toBe(b.innerHTML)
  })

  it('renders the real page heading while data loads', () => {
    const { getByRole } = render(<Loading />)
    expect(getByRole('heading', { name: 'Dashboard' })).toBeTruthy()
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
