/** @vitest-environment jsdom */

import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NavGroupDefinition } from '@876/core/access'

const mocks = vi.hoisted(() => ({
  pathname: '/',
  productMobileNav: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}))

vi.mock('./product-mobile-nav', () => ({
  ProductMobileNav: (props: Record<string, unknown>) => {
    mocks.productMobileNav(props)
    return <div>mobile nav</div>
  },
}))

import { Settings } from '../icons'
import { ContextualProductMobileNav } from './contextual-product-mobile-nav'

const navigation: NavGroupDefinition[] = [
  {
    key: 'main',
    entries: [
      {
        key: 'requests',
        title: 'Requests',
        href: '/requests',
        icon: 'requests',
        children: [
          {
            key: 'requests-list',
            title: 'Requests',
            href: '/requests',
            icon: 'requests',
          },
          {
            key: 'requests-customers',
            title: 'Customers',
            href: '/requests/customers',
            icon: 'customers',
          },
        ],
      },
      {
        key: 'sales',
        title: 'Sales',
        href: '/sales',
        icon: 'sales',
        children: [
          { key: 'quotes', title: 'Quotes', href: '/quotes', icon: 'sales' },
        ],
      },
    ],
  },
]

const contextOptions = {
  rootKey: 'app',
  rootBackLabel: 'App',
  sectionKeys: ['requests'],
} as const

function renderNav() {
  return render(
    <ContextualProductMobileNav
      title="App"
      subtitle="Acme"
      navigation={navigation}
      resolveIcon={() => Settings}
      contextOptions={contextOptions}
    />
  )
}

describe('ContextualProductMobileNav', () => {
  beforeEach(() => {
    mocks.pathname = '/'
    mocks.productMobileNav.mockClear()
  })

  it('turns contextual entries into links while preserving ordinary dropdown children', () => {
    renderNav()

    const props = mocks.productMobileNav.mock.calls.at(-1)?.[0] as {
      navigation: NavGroupDefinition[]
      expandChildren: boolean
    }
    const entries = props.navigation[0]!.entries

    expect(entries.find((entry) => entry.key === 'requests')?.children).toBeUndefined()
    expect(entries.find((entry) => entry.key === 'sales')?.children).toHaveLength(1)
    expect(props.expandChildren).toBe(true)
  })

  it('shows the contextual Requests menu on a deep Requests path', () => {
    mocks.pathname = '/requests/customers'
    renderNav()

    const props = mocks.productMobileNav.mock.calls.at(-1)?.[0] as {
      title: string
      navigation: NavGroupDefinition[]
      expandChildren: boolean
      backAction?: { label: string; onClick: () => void }
    }

    expect(props.title).toBe('Requests')
    expect(props.navigation.flatMap((group) => group.entries).map((entry) => entry.key)).toEqual([
      'requests-list',
      'requests-customers',
    ])
    expect(props.expandChildren).toBe(false)
    expect(props.backAction?.label).toBe('Back to App')
  })

  it('lets Back reveal the root navigation without changing the pathname', () => {
    mocks.pathname = '/requests/customers'
    renderNav()

    const first = mocks.productMobileNav.mock.calls.at(-1)?.[0] as {
      backAction?: { onClick: () => void }
    }
    act(() => first.backAction?.onClick())

    const props = mocks.productMobileNav.mock.calls.at(-1)?.[0] as {
      title: string
      navigation: NavGroupDefinition[]
      backAction?: unknown
    }
    expect(props.title).toBe('App')
    expect(props.navigation[0]!.entries.map((entry) => entry.key)).toEqual([
      'requests',
      'sales',
    ])
    expect(props.backAction).toBeUndefined()
  })
})
