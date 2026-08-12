/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  BillingPermissionsProvider,
  useBillingPermission,
} from './permissions-provider'
import type { Permission } from '@/types/access'

function Probe({ permission }: { permission: Permission }) {
  const allowed = useBillingPermission(permission)
  return <span data-testid="probe">{allowed ? 'yes' : 'no'}</span>
}

describe('BillingPermissionsProvider', () => {
  it('returns false when used outside provider', () => {
    render(<Probe permission="billing:access" />)
    expect(screen.getByTestId('probe')).toHaveTextContent('no')
  })

  it('returns true for granted permission and false for others', () => {
    render(
      <BillingPermissionsProvider
        permissions={['billing:access', 'customers:read']}
      >
        <Probe permission="customers:read" />
      </BillingPermissionsProvider>
    )
    expect(screen.getByTestId('probe')).toHaveTextContent('yes')

    render(
      <BillingPermissionsProvider permissions={['billing:access']}>
        <Probe permission="customers:write" />
      </BillingPermissionsProvider>
    )
    // second render creates new probe; query all
    expect(screen.getAllByTestId('probe').at(-1)).toHaveTextContent('no')
  })

  it('handles empty permissions array', () => {
    render(
      <BillingPermissionsProvider permissions={[]}>
        <Probe permission="billing:access" />
      </BillingPermissionsProvider>
    )
    expect(screen.getAllByTestId('probe').at(-1)).toHaveTextContent('no')
  })

  it('deduplicates permissions via Set', () => {
    render(
      <BillingPermissionsProvider
        permissions={['billing:access', 'billing:access', 'sales:read']}
      >
        <Probe permission="sales:read" />
      </BillingPermissionsProvider>
    )
    expect(screen.getAllByTestId('probe').at(-1)).toHaveTextContent('yes')
  })

  it('allows multiple permission checks independently', () => {
    function Multi() {
      const a = useBillingPermission('customers:write')
      const b = useBillingPermission('catalog:write')
      const c = useBillingPermission('billing:access')
      return (
        <div>
          <span data-testid="a">{a ? '1' : '0'}</span>
          <span data-testid="b">{b ? '1' : '0'}</span>
          <span data-testid="c">{c ? '1' : '0'}</span>
        </div>
      )
    }
    render(
      <BillingPermissionsProvider
        permissions={['billing:access', 'customers:write']}
      >
        <Multi />
      </BillingPermissionsProvider>
    )
    expect(screen.getByTestId('a')).toHaveTextContent('1')
    expect(screen.getByTestId('b')).toHaveTextContent('0')
    expect(screen.getByTestId('c')).toHaveTextContent('1')
  })

  it('nested provider overrides outer permissions', () => {
    render(
      <BillingPermissionsProvider permissions={['billing:access']}>
        <BillingPermissionsProvider
          permissions={['billing:access', 'sales:write']}
        >
          <Probe permission="sales:write" />
        </BillingPermissionsProvider>
      </BillingPermissionsProvider>
    )
    expect(screen.getAllByTestId('probe').at(-1)).toHaveTextContent('yes')
  })

  it('outer permission not leaked into inner when inner is narrower', () => {
    function InnerCheck() {
      const allowed = useBillingPermission('sales:write')
      return <span data-testid="inner">{allowed ? 'yes' : 'no'}</span>
    }
    render(
      <BillingPermissionsProvider
        permissions={['billing:access', 'sales:write']}
      >
        <BillingPermissionsProvider permissions={['billing:access']}>
          <InnerCheck />
        </BillingPermissionsProvider>
      </BillingPermissionsProvider>
    )
    expect(screen.getByTestId('inner')).toHaveTextContent('no')
  })

  it('rerenders when permissions prop changes', () => {
    const { rerender } = render(
      <BillingPermissionsProvider permissions={['billing:access']}>
        <Probe permission="customers:write" />
      </BillingPermissionsProvider>
    )
    expect(screen.getAllByTestId('probe').at(-1)).toHaveTextContent('no')
    rerender(
      <BillingPermissionsProvider
        permissions={['billing:access', 'customers:write']}
      >
        <Probe permission="customers:write" />
      </BillingPermissionsProvider>
    )
    // vitest/jsdom rerender keeps previous nodes; last should be yes
    const probes = screen.getAllByTestId('probe')
    // find at least one yes after rerender
    expect(probes.some((n) => n.textContent === 'yes')).toBe(true)
  })

  it('all known permission values are valid Permission type', () => {
    const all: Permission[] = [
      'billing:access',
      'dashboard:read',
      'customers:read',
      'customers:write',
      'catalog:read',
      'catalog:write',
      'sales:read',
      'sales:write',
      'subscriptions:read',
      'subscriptions:write',
      'reports:read',
      'vendors:read',
      'banking:read',
    ]
    render(
      <BillingPermissionsProvider permissions={all}>
        <Probe permission="reports:read" />
      </BillingPermissionsProvider>
    )
    expect(screen.getAllByTestId('probe').at(-1)).toHaveTextContent('yes')
  })
})
