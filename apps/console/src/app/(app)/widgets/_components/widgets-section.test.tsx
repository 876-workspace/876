// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  capturedDistribution: null as string | null,
  capturedTakeover: null as readonly string[] | null,
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/widgets',
  useSelectedLayoutSegments: () => [],
  useSearchParams: () => mocks.searchParams,
}))

vi.mock('@876/ui/list-detail-section', () => ({
  ListDetailSection: ({
    toolbar,
    takeoverSegments,
  }: {
    toolbar: React.ReactNode
    takeoverSegments: readonly string[]
  }) => {
    mocks.capturedTakeover = takeoverSegments
    return <div data-testid="list-detail-section">{toolbar}</div>
  },
}))

vi.mock('./widgets-toolbar', () => ({
  WidgetsToolbar: ({ distribution }: { distribution: string }) => {
    mocks.capturedDistribution = distribution
    return (
      <div data-testid="widgets-toolbar" data-distribution={distribution} />
    )
  },
}))

import React from 'react'
import { WidgetsSection } from './widgets-section'

describe('WidgetsSection — distribution resolution', () => {
  it('defaults to "all" when no distribution query parameter is present', () => {
    mocks.searchParams = new URLSearchParams()
    render(<WidgetsSection list={null}>{null}</WidgetsSection>)
    expect(mocks.capturedDistribution).toBe('all')
  })

  it('passes a valid distribution through', () => {
    mocks.searchParams = new URLSearchParams('distribution=shared')
    render(<WidgetsSection list={null}>{null}</WidgetsSection>)
    expect(mocks.capturedDistribution).toBe('shared')
  })

  it('falls back to "all" for an unrecognised distribution', () => {
    mocks.searchParams = new URLSearchParams('distribution=bogus')
    render(<WidgetsSection list={null}>{null}</WidgetsSection>)
    expect(mocks.capturedDistribution).toBe('all')
  })

  it('takes over the whole content area for the flag-registration route', () => {
    mocks.searchParams = new URLSearchParams()
    render(<WidgetsSection list={null}>{null}</WidgetsSection>)
    expect(mocks.capturedTakeover).toEqual(['new'])
  })
})
