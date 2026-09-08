import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NavEntry, NavGroupDefinition } from '@876/core/access'

const mocks = vi.hoisted(() => ({
  pathname: '/',
  productMobileNav: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}))

vi.mock('@876/ui/product-mobile-nav', () => ({
  ProductMobileNav: (props: Record<string, unknown>) => {
    mocks.productMobileNav(props)
    return <div>Console mobile navigation</div>
  },
}))

import { resolveNavIcon, resolveNavIconColor } from './nav-icons'
import { MobileNav } from './mobile-nav'

const issuesEntry: NavEntry = {
  key: 'projects-issues',
  title: 'Issues',
  href: '/projects/issues',
  icon: 'issues',
}

const navigation: NavGroupDefinition[] = [
  {
    key: 'platform',
    entries: [
      {
        key: 'projects',
        title: 'Projects',
        href: '/projects',
        icon: 'projects',
        children: [
          {
            key: 'projects-overview',
            title: 'Overview',
            href: '/projects',
            icon: 'overview',
          },
          issuesEntry,
        ],
      },
    ],
  },
]

describe('Console MobileNav', () => {
  beforeEach(() => {
    mocks.pathname = '/'
    mocks.productMobileNav.mockClear()
  })

  it('uses the shared drawer at the platform root without inline child expansion', () => {
    render(<MobileNav navigation={navigation} contexts={[]} />)

    expect(mocks.productMobileNav).toHaveBeenCalledTimes(1)
    expect(mocks.productMobileNav.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        title: 'Console',
        navigation,
        resolveIcon: resolveNavIcon,
        resolveIconColor: resolveNavIconColor,
        expandChildren: false,
        ariaLabel: 'Console navigation',
        triggerLabel: 'Open navigation',
        backAction: undefined,
      })
    )
  })

  it('preserves active and back behavior inside a nested context', () => {
    mocks.pathname = '/projects/issues/issue_123'
    render(<MobileNav navigation={navigation} contexts={[]} />)

    const nestedProps = mocks.productMobileNav.mock.calls.at(-1)?.[0] as {
      title: string
      navigation: NavGroupDefinition[]
      isActive: (item: NavEntry, pathname: string) => boolean
      backAction: { label: string; onClick: () => void }
    }

    expect(nestedProps.title).toBe('Projects')
    expect(nestedProps.navigation[0]?.entries).toEqual(
      navigation[0]?.entries[0]?.children
    )
    expect(nestedProps.isActive(issuesEntry, mocks.pathname)).toBe(true)
    expect(nestedProps.backAction.label).toBe('Back to Console')

    act(() => nestedProps.backAction.onClick())

    const rootProps = mocks.productMobileNav.mock.calls.at(-1)?.[0] as {
      title: string
      backAction?: unknown
    }
    expect(rootProps.title).toBe('Console')
    expect(rootProps.backAction).toBeUndefined()
  })
})
