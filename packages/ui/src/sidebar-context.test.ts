import { describe, expect, it } from 'vitest'
import { defineNavigation } from '@876/core/access'

import {
  resolveActiveEntryKey,
  resolveSidebarContextStack,
  sidebarContexts,
} from './sidebar-context'

const navigation = defineNavigation([
  {
    key: 'main',
    entries: [
      {
        key: 'sales',
        title: 'Sales',
        href: '/quotes',
        icon: 'sales',
        children: [
          { key: 'quotes', title: 'Quotes', href: '/quotes', icon: 'sales' },
          {
            key: 'invoices',
            title: 'Invoices',
            href: '/invoices',
            icon: 'sales',
          },
        ],
      },
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
    ],
  },
])

const options = {
  rootKey: 'finance',
  rootBackLabel: 'Billing',
  sectionKeys: ['requests'],
} as const

describe('sidebar context resolver', () => {
  it('promotes only explicitly declared sections', () => {
    const contexts = sidebarContexts(navigation, [], options)

    expect(contexts.map((context) => context.key)).toEqual([
      'finance',
      'requests',
    ])
  })

  it('does not reinterpret ordinary dropdown children as contexts', () => {
    const stack = resolveSidebarContextStack('/invoices', navigation, [], options)

    expect(stack.map((context) => context.key)).toEqual(['finance'])
  })

  it('derives the Requests context from deep links', () => {
    const stack = resolveSidebarContextStack(
      '/requests/req_123',
      navigation,
      [],
      options
    )

    expect(stack.map((context) => context.key)).toEqual([
      'finance',
      'requests',
    ])
    expect(resolveActiveEntryKey('/requests/req_123', stack[1]!)).toBe(
      'requests-list'
    )
  })

  it('selects the longest matching child path', () => {
    const stack = resolveSidebarContextStack(
      '/requests/customers/cus_123',
      navigation,
      [],
      options
    )

    expect(resolveActiveEntryKey('/requests/customers/cus_123', stack[1]!)).toBe(
      'requests-customers'
    )
  })
})
