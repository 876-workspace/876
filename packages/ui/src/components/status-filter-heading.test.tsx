import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

import { StatusFilterHeading } from './status-filter-heading'

const mocks = vi.hoisted(() => ({
  pathname: '/users',
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => mocks.searchParams,
}))

const OPTIONS = [
  { value: 'all', label: 'All users' },
  { value: 'active', label: 'Active users' },
]

async function hrefOf(label: string, basePath?: string) {
  const user = userEvent.setup()
  render(
    <StatusFilterHeading
      label="Users"
      value="all"
      options={OPTIONS}
      basePath={basePath}
    />
  )
  await user.click(screen.getByRole('button'))
  const href = (await screen.findByRole('menuitem', { name: label }))
    .closest('a')
    ?.getAttribute('href')
  cleanup()
  return href
}

describe('StatusFilterHeading', () => {
  beforeEach(() => {
    mocks.pathname = '/users'
    mocks.searchParams = new URLSearchParams()
  })

  it('links to the current pathname by default', async () => {
    mocks.pathname = '/users/alejandra'

    expect(await hrefOf('Active users')).toBe('/users/alejandra?status=active')
  })

  it('links to basePath when one is given, so an open record returns to the list', async () => {
    mocks.pathname = '/users/alejandra'

    expect(await hrefOf('Active users', '/users')).toBe('/users?status=active')
  })

  it('drops pagination cursors and keeps other params', async () => {
    mocks.searchParams = new URLSearchParams('q=ale&after=user_9&before=user_1')

    expect(await hrefOf('Active users', '/users')).toBe(
      '/users?q=ale&status=active'
    )
  })

  it('removes the param for the all option', async () => {
    mocks.searchParams = new URLSearchParams('status=active')

    expect(await hrefOf('All users', '/users')).toBe('/users')
  })
})
