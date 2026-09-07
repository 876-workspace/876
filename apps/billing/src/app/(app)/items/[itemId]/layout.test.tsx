import type { ReactElement, ReactNode } from 'react'
import { isValidElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getWorkspaceContext: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('notFound')
  }),
  resolveItem: vi.fn(),
}))

vi.mock('next/navigation', () => ({ notFound: mocks.notFound }))
vi.mock('@/lib/auth/billing-context', () => ({
  getWorkspaceContext: mocks.getWorkspaceContext,
}))
vi.mock('@/app/(app)/_lib/detail-data', () => ({
  resolveItem: mocks.resolveItem,
}))
vi.mock('@/features/catalog/components/catalog-resource-actions', () => ({
  CatalogResourceActions: () => null,
}))
vi.mock('@876/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('@876/ui/skeleton', () => ({ Skeleton: () => <span data-skeleton /> }))
vi.mock('@876/ui/detail-card', () => ({
  DetailCard: ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  ),
  DetailCardBody: ({ children }: { children: ReactNode }) => (
    <main>{children}</main>
  ),
  DetailCardHeader: () => <header />,
  DetailCardMeta: ({ children }: { children: ReactNode }) => (
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

function findElement(
  node: ReactNode,
  predicate: (element: AnyElement) => boolean
): AnyElement | undefined {
  if (!isValidElement(node)) return undefined
  const element = node as AnyElement
  if (predicate(element)) return element
  const children = element.props.children as ReactNode
  for (const child of Array.isArray(children) ? children : [children]) {
    const match = findElement(child, predicate)
    if (match) return match
  }
  return undefined
}

describe('ItemDetailLayout', () => {
  it('renders the tab strip before item data resolves', async () => {
    mocks.getWorkspaceContext.mockReturnValue(new Promise(() => {}))

    const layout = await Promise.race([
      ItemDetailLayout({
        children: <div />,
        params: Promise.resolve({ itemId: 'item_123' }),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('layout blocked')), 20)
      ),
    ])

    const tabs = findElement(layout, (element) =>
      Array.isArray(element.props.tabs)
    )
    expect(tabs?.props.tabs).toEqual([
      { label: 'Overview', href: '/items/item_123', exact: true },
      { label: 'Prices', href: '/items/item_123/prices' },
      { label: 'Transactions', href: '/items/item_123/transactions' },
      { label: 'Audit', href: '/items/item_123/audit' },
    ])
    expect(mocks.getWorkspaceContext).not.toHaveBeenCalled()
  })

  it('routes every tab from the item identifier', async () => {
    const layout = await ItemDetailLayout({
      children: <div />,
      params: Promise.resolve({ itemId: 'item_abc' }),
    })

    const tabs = findElement(layout, (element) =>
      Array.isArray(element.props.tabs)
    )
    expect(tabs?.props.tabs).toEqual([
      { label: 'Overview', href: '/items/item_abc', exact: true },
      { label: 'Prices', href: '/items/item_abc/prices' },
      { label: 'Transactions', href: '/items/item_abc/transactions' },
      { label: 'Audit', href: '/items/item_abc/audit' },
    ])
  })

  it('calls notFound from the streamed header when the item is absent', async () => {
    mocks.getWorkspaceContext.mockResolvedValue({
      tenant: { id: 'tenant_123' },
      permissions: ['catalog:write'],
    })
    mocks.resolveItem.mockResolvedValue(null)

    const layout = await ItemDetailLayout({
      children: <div />,
      params: Promise.resolve({ itemId: 'item_missing' }),
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

    await expect(renderHeader(header.props)).rejects.toThrow('notFound')
    expect(mocks.resolveItem).toHaveBeenCalledWith('tenant_123', 'item_missing')
    expect(mocks.notFound).toHaveBeenCalledTimes(1)
  })
})
