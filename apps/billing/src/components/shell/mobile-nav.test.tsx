/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { NavGroupDefinition } from '@876/core/access'

const mocks = vi.hoisted(() => ({ contextualMobileNav: vi.fn() }))

vi.mock('@876/ui/contextual-product-mobile-nav', () => ({
  ContextualProductMobileNav: (props: Record<string, unknown>) => {
    mocks.contextualMobileNav(props)
    return <div>Billing mobile navigation</div>
  },
}))

import { resolveBillingNavIcon } from './nav-icons'
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

describe('Billing MobileNav', () => {
  it('declares Requests as the only contextual mobile section', () => {
    render(<MobileNav tenantName="Island Commerce" navigation={navigation} />)

    expect(screen.getByText('Billing mobile navigation')).toBeVisible()
    expect(mocks.contextualMobileNav).toHaveBeenCalledTimes(1)
    expect(mocks.contextualMobileNav).toHaveBeenCalledWith({
      title: 'Billing',
      subtitle: 'Island Commerce',
      navigation,
      resolveIcon: resolveBillingNavIcon,
      contextOptions: {
        rootKey: 'billing',
        rootBackLabel: 'Billing',
        sectionKeys: ['requests'],
      },
    })
  })
})
