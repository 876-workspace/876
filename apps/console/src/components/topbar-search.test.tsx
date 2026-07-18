/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TopbarSearchItem } from '@876/ui/topbar-search'

const mocks = vi.hoisted(() => ({
  routerPush: vi.fn(),
  sharedTopbarSearch: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}))

vi.mock('@876/ui/topbar-search', () => ({
  TopbarSearch: ({
    items,
    onNavigate,
  }: {
    items: TopbarSearchItem[]
    onNavigate: (href: string) => void
  }) => {
    mocks.sharedTopbarSearch({ items, onNavigate })

    return (
      <div>
        <button
          type="button"
          onClick={(event) => {
            event.currentTarget.nextElementSibling?.removeAttribute('hidden')
          }}
        >
          Search...⌘K
        </button>
        <div role="dialog" aria-label="Search" hidden>
          {items.map((item) => (
            <button
              key={`${item.group}:${item.title}:${item.href}`}
              type="button"
              role="option"
              aria-selected={false}
              onClick={(event) => {
                event.currentTarget
                  .closest('[role="dialog"]')
                  ?.setAttribute('hidden', '')
                onNavigate(item.href)
              }}
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>
    )
  },
}))

import {
  consoleNav,
  consoleSettingsItem,
  SETTINGS_SECTIONS,
} from './console-nav-config'
import { TopbarSearch } from './topbar-search'

function createExpectedSearchItems(): TopbarSearchItem[] {
  return [
    ...consoleNav.flatMap((group) =>
      group.items.map((item) => ({
        group: 'Navigation',
        title: item.title,
        href: item.href,
      }))
    ),
    ...consoleNav.flatMap((group) =>
      group.items.flatMap((item) =>
        (item.children ?? []).map((child) => ({
          group: item.title,
          title: child.title,
          href: child.href,
        }))
      )
    ),
    {
      group: 'Settings',
      title: consoleSettingsItem.title,
      href: consoleSettingsItem.href,
    },
    ...SETTINGS_SECTIONS.map((section) => ({
      group: consoleSettingsItem.title,
      title: section.title,
      href: section.href,
    })),
  ]
}

describe('Console TopbarSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds the complete search item list from the real console navigation config', () => {
    const expectedItems = createExpectedSearchItems()
    render(<TopbarSearch />)
    const props = mocks.sharedTopbarSearch.mock.calls[0]?.[0] as {
      items: TopbarSearchItem[]
      onNavigate: (href: string) => void
    }

    expect(mocks.sharedTopbarSearch).toHaveBeenCalledTimes(1)
    expect(props).toEqual({
      items: expectedItems,
      onNavigate: expect.any(Function),
    })
    expect(props.items.find((item) => item.title === 'Dashboard')).toEqual({
      group: 'Navigation',
      title: 'Dashboard',
      href: '/',
    })
    expect(props.items.find((item) => item.title === 'Users')).toEqual({
      group: 'Navigation',
      title: 'Users',
      href: '/users',
    })
    expect(
      props.items.find(
        (item) => item.group === 'Settings' && item.title === 'Settings'
      )
    ).toEqual({
      group: 'Settings',
      title: 'Settings',
      href: '/settings',
    })
    expect(mocks.routerPush).not.toHaveBeenCalled()
  })

  it('pushes the exact selected href once and closes the search dialog', async () => {
    const user = userEvent.setup()
    render(<TopbarSearch />)
    await user.click(screen.getByRole('button', { name: 'Search...⌘K' }))

    await user.click(await screen.findByRole('option', { name: 'Dashboard' }))

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Search' })
      ).not.toBeInTheDocument()
    })
    expect(mocks.sharedTopbarSearch).toHaveBeenCalledTimes(1)
    expect(mocks.sharedTopbarSearch.mock.calls[0]?.[0]).toEqual({
      items: createExpectedSearchItems(),
      onNavigate: expect.any(Function),
    })
    expect(mocks.routerPush).toHaveBeenCalledTimes(1)
    expect(mocks.routerPush).toHaveBeenCalledWith('/')
  })
})
