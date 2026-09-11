// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  capturedStatus: null as string | null,
  capturedTakeover: null as readonly string[] | null,
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/orgs',
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

vi.mock('./orgs-toolbar', () => ({
  OrgsToolbar: ({ status }: { status: string }) => {
    mocks.capturedStatus = status
    return <div data-testid="orgs-toolbar" data-status={status} />
  },
}))

import React from 'react'
import { OrgsSection } from './orgs-section'

describe('OrgsSection — status resolution', () => {
  it('defaults to "all" when no status query parameter is present', () => {
    mocks.searchParams = new URLSearchParams()
    render(<OrgsSection list={null}>{null}</OrgsSection>)
    expect(mocks.capturedStatus).toBe('all')
  })

  it('passes a valid status through to the toolbar', () => {
    mocks.searchParams = new URLSearchParams('status=archived')
    render(<OrgsSection list={null}>{null}</OrgsSection>)
    expect(mocks.capturedStatus).toBe('archived')
  })

  it('falls back to "all" for an unrecognised status', () => {
    mocks.searchParams = new URLSearchParams('status=bogus')
    render(<OrgsSection list={null}>{null}</OrgsSection>)
    expect(mocks.capturedStatus).toBe('all')
  })

  it('takes over the whole content area for create and edit routes', () => {
    mocks.searchParams = new URLSearchParams()
    render(<OrgsSection list={null}>{null}</OrgsSection>)
    expect(mocks.capturedTakeover).toEqual(['new', 'edit'])
  })
})
