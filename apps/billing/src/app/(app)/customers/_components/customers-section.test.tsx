/** @vitest-environment jsdom */

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  capturedStatus: null as string | null,
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/customers',
  useSelectedLayoutSegments: () => [],
  useSearchParams: () => mocks.searchParams,
}))

vi.mock('@876/ui/list-detail-section', () => ({
  ListDetailSection: ({ toolbar }: { toolbar: React.ReactNode }) => (
    <div data-testid="list-detail-section">{toolbar}</div>
  ),
}))

vi.mock('./customers-toolbar', () => ({
  CustomersToolbar: ({ status }: { status: string }) => {
    mocks.capturedStatus = status
    return <div data-testid="customers-toolbar" data-status={status} />
  },
}))

import React from 'react'
import { CustomersSection } from './customers-section'

describe('CustomersSection — status resolution', () => {
  it('defaults to "active" when no status query parameter is present', () => {
    mocks.searchParams = new URLSearchParams()
    render(<CustomersSection list={null}>{null}</CustomersSection>)
    expect(mocks.capturedStatus).toBe('active')
  })

  it('resolves to "all" when ?status=all is present', () => {
    mocks.searchParams = new URLSearchParams('status=all')
    render(<CustomersSection list={null}>{null}</CustomersSection>)
    expect(mocks.capturedStatus).toBe('all')
  })

  it('resolves to "archived" when ?status=archived is present', () => {
    mocks.searchParams = new URLSearchParams('status=archived')
    render(<CustomersSection list={null}>{null}</CustomersSection>)
    expect(mocks.capturedStatus).toBe('archived')
  })

  it('resolves to "active" when ?status=active is present', () => {
    mocks.searchParams = new URLSearchParams('status=active')
    render(<CustomersSection list={null}>{null}</CustomersSection>)
    expect(mocks.capturedStatus).toBe('active')
  })

  it('passes an unrecognised value through (section does not validate — toolbar does)', () => {
    mocks.searchParams = new URLSearchParams('status=bogus')
    render(<CustomersSection list={null}>{null}</CustomersSection>)
    // The section passes raw param value; the toolbar/heading handles unknown values.
    // The critical check is that it does NOT fall back to 'all' — 'all' is only
    // the pre-change default. An unrecognised param is not the absent-param case.
    expect(mocks.capturedStatus).toBe('bogus')
  })
})
