import type { ReactElement, ReactNode } from 'react'
import { isValidElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getInvoice: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('notFound')
  }),
  redirect: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}))
vi.mock('@/lib/invoice', () => ({ getInvoice: mocks.getInvoice }))
vi.mock('./_components/item-actions', () => ({
  ItemActions: () => <span data-item-actions />,
}))
vi.mock('@876/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('@876/ui/icons', () => ({
  CircleStackIcon: () => <span />,
  WrenchScrewdriverIcon: () => <span />,
}))
vi.mock('@876/ui/skeleton', () => ({ Skeleton: () => <span data-skeleton /> }))
vi.mock('@876/ui/detail-card', () => ({
  DetailCard: ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  ),
  DetailCardBody: ({ children }: { children: ReactNode }) => (
    <main>{children}</main>
  ),
  DetailCardHeader: ({ actions }: { actions?: ReactNode }) => (
    <header>{actions}</header>
  ),
  DetailCardIcon: ({ children }: { children: ReactNode }) => (
    <span>{children}</span>
  ),
  DetailCardRouteTabs: ({
    tabs,
  }: {
    tabs: Array<{ href: string; label: string }>
  }) => (
    <nav>
      {tabs.map((tab) => (
        <a href={tab.href} key={tab.href}>
          {tab.label}
        </a>
      ))}
    </nav>
  ),
}))

import ItemDetailLayout from './layout'

/**
 * React 19 types `ReactElement['props']` as `unknown`, so every introspection
 * below would need its own cast. Naming the props shape once here keeps the
 * assertions readable.
 */
type AnyElement = ReactElement<Record<string, unknown>>

/**
 * Walks every prop, not just `children`: the layout hands components to
 * `DetailCardHeader` through `actions`, `icon` and `subtitle`, and to
 * `Suspense` through `fallback`. A children-only walk finds none of them.
 */
function findElement(
  node: ReactNode,
  predicate: (element: AnyElement) => boolean
): AnyElement | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElement(child, predicate)
      if (match) return match
    }
    return undefined
  }

  if (!isValidElement(node)) return undefined
  const element = node as AnyElement
  if (predicate(element)) return element

  for (const value of Object.values(element.props)) {
    const match = findElement(value as ReactNode, predicate)
    if (match) return match
  }
  return undefined
}

describe('ItemDetailLayout', () => {
  it('renders only the Invoice overview and transactions tabs', async () => {
    const layout = await ItemDetailLayout({
      children: <div />,
      params: Promise.resolve({ itemId: 'item_123' }),
    })
    const tabs = findElement(layout, (element) =>
      Array.isArray(element.props.tabs)
    )

    expect(tabs?.props.tabs).toEqual([
      { label: 'Overview', href: '/items/item_123', exact: true },
      { label: 'Transactions', href: '/items/item_123/transactions' },
    ])
  })

  it('keeps the header behind a Suspense fallback while invoice data is pending', async () => {
    mocks.getInvoice.mockReturnValue(new Promise(() => {}))
    const layout = await ItemDetailLayout({
      children: <div />,
      params: Promise.resolve({ itemId: 'item_123' }),
    })
    const suspense = findElement(
      layout,
      (element) => (element.type as unknown) === Symbol.for('react.suspense')
    )

    expect(suspense?.props.fallback).toBeTruthy()
    expect(mocks.getInvoice).not.toHaveBeenCalled()
  })

  it('places ItemActions in the streamed header exactly once', async () => {
    mocks.getInvoice.mockResolvedValue({
      role: 'admin',
      items: {
        retrieve: vi.fn().mockResolvedValue({
          data: {
            id: 'item_123',
            name: 'Consulting',
            type: 'SERVICE',
            isActive: true,
            sku: null,
          },
          error: null,
        }),
      },
    })
    const layout = await ItemDetailLayout({
      children: <div />,
      params: Promise.resolve({ itemId: 'item_123' }),
    })
    const header = findElement(
      layout,
      (element) =>
        typeof element.type === 'function' &&
        element.type.name === 'ItemHeaderData'
    )
    if (!header)
      throw new Error('ItemHeaderData was not rendered by the layout')
    const renderHeader = header.type as (props: object) => Promise<ReactNode>
    const headerResult = await renderHeader(header.props)
    const action = findElement(
      headerResult,
      (element) =>
        typeof element.type === 'function' &&
        element.type.name === 'ItemActions'
    )

    expect(action?.props).toEqual({
      itemId: 'item_123',
      itemName: 'Consulting',
      isActive: true,
      canManage: true,
    })
  })
})
