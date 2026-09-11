/** @vitest-environment jsdom */

import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  navigationTestState,
  resetNavigationTestState,
} from '@/test/next-navigation-stub'

const mocks = vi.hoisted(() => ({
  capturedStatus: null as string | null,
}))

vi.mock('@876/ui/list-detail-section', () => ({
  ListDetailSection: ({ toolbar }: { toolbar: React.ReactNode }) => (
    <div data-testid="list-detail-section">{toolbar}</div>
  ),
}))

vi.mock('@876/ui/list-detail-shell', () => ({
  useListDetailRoute: () => ({ open: false }),
}))

vi.mock('./customers-toolbar', () => ({
  CustomersToolbar: ({ status }: { status: string; showPrimary: boolean }) => {
    mocks.capturedStatus = status
    return <div data-testid="customers-toolbar" data-status={status} />
  },
}))

import React from 'react'
import { CustomersSection } from './customers-section'

describe('CustomersSection — status resolution', () => {
  beforeEach(() => {
    resetNavigationTestState()
    mocks.capturedStatus = null
  })

  it('defaults to "active" when no status query parameter is present', () => {
    render(<CustomersSection list={null}>{null}</CustomersSection>)
    expect(mocks.capturedStatus).toBe('active')
  })

  it('resolves to "all" when ?status=all is present', () => {
    navigationTestState.searchParams = new URLSearchParams('status=all')
    render(<CustomersSection list={null}>{null}</CustomersSection>)
    expect(mocks.capturedStatus).toBe('all')
  })

  it('resolves to "archived" when ?status=archived is present', () => {
    navigationTestState.searchParams = new URLSearchParams('status=archived')
    render(<CustomersSection list={null}>{null}</CustomersSection>)
    expect(mocks.capturedStatus).toBe('archived')
  })

  it('resolves to "active" when ?status=active is present', () => {
    navigationTestState.searchParams = new URLSearchParams('status=active')
    render(<CustomersSection list={null}>{null}</CustomersSection>)
    expect(mocks.capturedStatus).toBe('active')
  })

  it('passes an unrecognised value through rather than collapsing to the absent-param default', () => {
    navigationTestState.searchParams = new URLSearchParams('status=bogus')
    render(<CustomersSection list={null}>{null}</CustomersSection>)
    // When a param is present but unknown, the raw value is forwarded; only a
    // missing param triggers the 'active' fallback.
    expect(mocks.capturedStatus).toBe('bogus')
  })
})
