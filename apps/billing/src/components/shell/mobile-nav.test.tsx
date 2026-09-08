/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { NavGroupDefinition } from '@876/core/access'

const mocks = vi.hoisted(() => ({ productMobileNav: vi.fn() }))

vi.mock('@876/ui/product-mobile-nav', () => ({
  ProductMobileNav: (props: Record<string, unknown>) => {
    mocks.productMobileNav(props)
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
  it('passes Billing identity and resolved navigation to the shared drawer', () => {
    render(<MobileNav tenantName="Island Commerce" navigation={navigation} />)

    expect(screen.getByText('Billing mobile navigation')).toBeVisible()
    expect(mocks.productMobileNav).toHaveBeenCalledTimes(1)
    expect(mocks.productMobileNav).toHaveBeenCalledWith({
      title: 'Billing',
      subtitle: 'Island Commerce',
      navigation,
      resolveIcon: resolveBillingNavIcon,
    })
  })
})
