/** @vitest-environment jsdom */

import { render } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'

import type { NavGroupDefinition } from '@876/core/access'
import { SidebarProvider } from '@876/ui/sidebar'

import { WorkspaceSidebar } from './sidebar'

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

beforeAll(() => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1024,
  })
  window.matchMedia = () =>
    ({
      matches: false,
      media: '',
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList
})

describe('Billing WorkspaceSidebar', () => {
  it('keeps the desktop rail docked and icon-collapsible', () => {
    const { container } = render(
      <SidebarProvider>
        <WorkspaceSidebar
          tenantName="Island Commerce"
          navigation={navigation}
        />
      </SidebarProvider>
    )

    const sidebar = container.querySelector<HTMLElement>(
      '[data-slot="sidebar"]'
    )

    expect(sidebar).toHaveAttribute('data-variant', 'sidebar')
    expect(sidebar).toHaveAttribute('data-collapsible', '')
    expect(sidebar).toHaveAttribute('data-state', 'expanded')
  })
})
