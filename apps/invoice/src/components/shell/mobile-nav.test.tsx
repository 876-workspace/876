/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { NavGroupDefinition } from '@876/core/access'

const mocks = vi.hoisted(() => ({ contextualMobileNav: vi.fn() }))

vi.mock('@876/ui/contextual-product-mobile-nav', () => ({
  ContextualProductMobileNav: (props: Record<string, unknown>) => {
    mocks.contextualMobileNav(props)
    return <div>Invoice mobile navigation</div>
  },
}))

import { resolveInvoiceNavIcon } from './nav-icons'
import { MobileNav } from './mobile-nav'

const navigation: NavGroupDefinition[] = [
  {
    key: 'workspace',
    entries: [
      {
        key: 'home',
        title: 'Home',
        href: '/',
        icon: 'dashboard',
      },
    ],
  },
]

describe('Invoice MobileNav', () => {
  it('declares Requests as the only contextual mobile section', () => {
    render(<MobileNav orgName="Island Commerce" navigation={navigation} />)

    expect(screen.getByText('Invoice mobile navigation')).toBeVisible()
    expect(mocks.contextualMobileNav).toHaveBeenCalledTimes(1)
    expect(mocks.contextualMobileNav).toHaveBeenCalledWith({
      title: 'Invoice',
      subtitle: 'Island Commerce',
      navigation,
      resolveIcon: resolveInvoiceNavIcon,
      contextOptions: {
        rootKey: 'invoice',
        rootBackLabel: 'Invoice',
        sectionKeys: ['requests'],
      },
    })
  })
})
