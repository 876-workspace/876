/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OrgSearchBar } from './org-search-bar'

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => navigation.searchParams,
}))

describe('OrgSearchBar', () => {
  beforeEach(() => {
    navigation.push.mockClear()
    navigation.searchParams = new URLSearchParams()
  })

  it('submits organization searches to the orgs route', async () => {
    const user = userEvent.setup()
    render(<OrgSearchBar />)

    await user.type(
      screen.getByPlaceholderText(/search organizations by name/i),
      '  acme north  '
    )
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(navigation.push).toHaveBeenCalledWith('/orgs?q=acme%20north')
  })

  it('hydrates the query from search params and clears to the orgs route', async () => {
    const user = userEvent.setup()
    navigation.searchParams = new URLSearchParams({ q: 'existing org' })

    render(<OrgSearchBar />)

    const input = screen.getByPlaceholderText(/search organizations by name/i)
    expect(input).toHaveValue('existing org')

    await user.clear(input)
    await user.type(input, '   {Enter}')

    expect(navigation.push).toHaveBeenCalledWith('/orgs')
  })
})
