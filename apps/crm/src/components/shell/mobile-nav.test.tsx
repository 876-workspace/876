import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { NavGroupDefinition } from '@876/core/access'

const mocks = vi.hoisted(() => ({ productMobileNav: vi.fn() }))

vi.mock('@876/ui/product-mobile-nav', () => ({
  ProductMobileNav: (props: Record<string, unknown>) => {
    mocks.productMobileNav(props)
    return <div>CRM mobile navigation</div>
  },
}))

import { resolveCrmNavIcon } from './nav-icons'
import { MobileNav } from './mobile-nav'

const navigation: NavGroupDefinition[] = [
  {
    key: 'workspace',
    entries: [
      {
        key: 'dashboard',
        title: 'Dashboard',
        href: '/',
        icon: 'dashboard',
      },
    ],
  },
]

describe('CRM MobileNav', () => {
  it('passes CRM identity and resolved navigation to the shared drawer', () => {
    render(<MobileNav orgName="Island Commerce" navigation={navigation} />)

    expect(screen.getByText('CRM mobile navigation')).toBeVisible()
    expect(mocks.productMobileNav).toHaveBeenCalledTimes(1)
    expect(mocks.productMobileNav).toHaveBeenCalledWith({
      title: 'CRM',
      subtitle: 'Island Commerce',
      navigation,
      resolveIcon: resolveCrmNavIcon,
    })
  })
})
