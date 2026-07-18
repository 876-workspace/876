/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CursorPagination } from './cursor-pagination'

const navigation = vi.hoisted(() => ({
  pathname: '/users',
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => navigation.searchParams,
}))

describe('CursorPagination', () => {
  beforeEach(() => {
    navigation.pathname = '/users'
    navigation.searchParams = new URLSearchParams()
  })

  it('does not render controls when there is only one page', () => {
    const { container } = render(
      <CursorPagination
        firstId="user_1"
        lastId="user_2"
        hasMore={false}
        count={2}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('builds next-page links while preserving unrelated filters', () => {
    navigation.searchParams = new URLSearchParams({ q: 'ada' })

    render(
      <CursorPagination
        firstId="user_1"
        lastId="user_2"
        hasMore={true}
        count={2}
      />
    )

    expect(screen.getByText('2 records')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/users?q=ada&after=user_2'
    )
  })

  it('builds previous-page links and clears the after cursor', () => {
    navigation.searchParams = new URLSearchParams({
      q: 'ada',
      after: 'user_2',
    })

    render(
      <CursorPagination
        firstId="user_1"
        lastId="user_3"
        hasMore={false}
        count={2}
      />
    )

    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/users?q=ada&before=user_1'
    )
  })
})
