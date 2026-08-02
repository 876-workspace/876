/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserSearchBar } from './user-search-bar'

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => navigation.searchParams,
}))

describe('UserSearchBar', () => {
  beforeEach(() => {
    navigation.push.mockClear()
    navigation.searchParams = new URLSearchParams()
  })

  it('submits a trimmed and encoded user search query', async () => {
    const user = userEvent.setup()
    render(<UserSearchBar />)

    await user.type(
      screen.getByPlaceholderText(/search users by name/i),
      '  ada lovelace@example.com  '
    )
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(navigation.push).toHaveBeenCalledWith(
      '/users?q=ada%20lovelace%40example.com'
    )
  })

  it('returns to the users index when an existing query is cleared', async () => {
    navigation.searchParams = new URLSearchParams({ q: 'grace' })
    const user = userEvent.setup()
    render(<UserSearchBar />)

    const input = screen.getByDisplayValue('grace')
    await user.clear(input)
    await user.keyboard('{Enter}')

    expect(navigation.push).toHaveBeenCalledWith('/users')
  })
})
