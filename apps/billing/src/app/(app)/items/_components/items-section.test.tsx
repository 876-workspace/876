/** @vitest-environment jsdom */

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  capturedStatus: null as string | null,
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/items',
  useSelectedLayoutSegments: () => [],
  useSearchParams: () => mocks.searchParams,
}))

vi.mock('@876/ui/list-detail-section', () => ({
  ListDetailSection: ({ toolbar }: { toolbar: React.ReactNode }) => (
    <div data-testid="list-detail-section">{toolbar}</div>
  ),
}))

vi.mock('./items-toolbar', () => ({
  ItemsToolbar: ({ status }: { status: string }) => {
    mocks.capturedStatus = status
    return <div data-testid="items-toolbar" data-status={status} />
  },
}))

import React from 'react'
import { ItemsSection } from './items-section'

describe('ItemsSection — status resolution', () => {
  it('defaults to "active" when no status query parameter is present', () => {
    mocks.searchParams = new URLSearchParams()
    render(<ItemsSection list={null} children={null} />)
    expect(mocks.capturedStatus).toBe('active')
  })

  it('resolves to "all" when ?status=all is present', () => {
    mocks.searchParams = new URLSearchParams('status=all')
    render(<ItemsSection list={null} children={null} />)
    expect(mocks.capturedStatus).toBe('all')
  })

  it('resolves to "archived" when ?status=archived is present', () => {
    mocks.searchParams = new URLSearchParams('status=archived')
    render(<ItemsSection list={null} children={null} />)
    expect(mocks.capturedStatus).toBe('archived')
  })

  it('resolves to "active" when ?status=active is present', () => {
    mocks.searchParams = new URLSearchParams('status=active')
    render(<ItemsSection list={null} children={null} />)
    expect(mocks.capturedStatus).toBe('active')
  })

  it('passes an unrecognised value through (section does not validate — toolbar does)', () => {
    mocks.searchParams = new URLSearchParams('status=bogus')
    render(<ItemsSection list={null} children={null} />)
    // The section passes the raw param; the toolbar heading handles unknown values.
    // Crucially, 'bogus' must not be replaced with 'all' — the null-param case alone
    // triggers the fallback.
    expect(mocks.capturedStatus).toBe('bogus')
  })
})
