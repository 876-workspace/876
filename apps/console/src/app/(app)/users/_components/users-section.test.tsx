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
  usePathname: () => '/users',
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

vi.mock('./users-toolbar', () => ({
  UsersToolbar: ({ status }: { status: string }) => {
    mocks.capturedStatus = status
    return <div data-testid="users-toolbar" data-status={status} />
  },
}))

import React from 'react'
import { UsersSection } from './users-section'

describe('UsersSection — status resolution', () => {
  it('defaults to "all" when no status query parameter is present', () => {
    mocks.searchParams = new URLSearchParams()
    render(<UsersSection list={null}>{null}</UsersSection>)
    expect(mocks.capturedStatus).toBe('all')
  })

  it('resolves to "all" when ?status=all is present', () => {
    mocks.searchParams = new URLSearchParams('status=all')
    render(<UsersSection list={null}>{null}</UsersSection>)
    expect(mocks.capturedStatus).toBe('all')
  })

  it('passes a valid status through to the toolbar', () => {
    mocks.searchParams = new URLSearchParams('status=suspended')
    render(<UsersSection list={null}>{null}</UsersSection>)
    expect(mocks.capturedStatus).toBe('suspended')
  })

  it('falls back to "all" for an unrecognised status', () => {
    mocks.searchParams = new URLSearchParams('status=bogus')
    render(<UsersSection list={null}>{null}</UsersSection>)
    expect(mocks.capturedStatus).toBe('all')
  })

  it('takes over the whole content area for create and edit routes', () => {
    mocks.searchParams = new URLSearchParams()
    render(<UsersSection list={null}>{null}</UsersSection>)
    expect(mocks.capturedTakeover).toEqual(['new', 'edit'])
  })
})
