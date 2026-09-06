/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { PermissionMatrixPanel } from './permission-matrix-panel'
import type { FinancePermissionSurface } from './types'
const surface: FinancePermissionSurface = {
  app: 'invoice',
  editable: ['billing:access', 'customers:read', 'customers:write'],
  modules: [
    {
      key: 'customers',
      label: 'Customers',
      permissions: [
        { key: 'customers:read', label: 'View' },
        { key: 'customers:write', label: 'Manage' },
      ],
    },
  ],
}
describe('PermissionMatrixPanel', () => {
  it('names every checkbox accessibly', () => {
    render(
      <PermissionMatrixPanel
        surface={surface}
        selected={['billing:access']}
        onChange={vi.fn()}
      />
    )
    expect(
      screen.getByRole('checkbox', { name: 'Customers: View' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Customers: Manage' })
    ).toBeInTheDocument()
  })
  it('sends write and implied read on a write selection', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <PermissionMatrixPanel
        surface={surface}
        selected={['billing:access']}
        onChange={onChange}
      />
    )
    await user.click(
      screen.getByRole('checkbox', { name: 'Customers: Manage' })
    )
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith([
      'billing:access',
      'customers:read',
      'customers:write',
    ])
  })
  it('does not call onChange when disabled', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <PermissionMatrixPanel
        surface={surface}
        selected={['billing:access']}
        disabled
        onChange={onChange}
      />
    )
    await user.click(screen.getByRole('checkbox', { name: 'Customers: View' }))
    expect(onChange).not.toHaveBeenCalled()
  })
  it('shows external grants as preserved', () => {
    render(
      <PermissionMatrixPanel
        surface={surface}
        selected={['billing:access']}
        rolePermissions={['billing:access', 'banking:read']}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('Also granted in 876 Billing')).toBeInTheDocument()
    expect(screen.getByText('banking:read')).toBeInTheDocument()
  })
  it('selects every module permission', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <PermissionMatrixPanel
        surface={surface}
        selected={['billing:access']}
        onChange={onChange}
      />
    )
    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith([
      'billing:access',
      'customers:read',
      'customers:write',
    ])
  })
  it('does not remove billing access through its checkbox', () => {
    render(
      <PermissionMatrixPanel
        surface={surface}
        selected={['billing:access']}
        onChange={vi.fn()}
      />
    )
    expect(
      screen.getByRole('checkbox', { name: 'Customers: View' })
    ).not.toBeDisabled()
    expect(
      screen.queryByRole('checkbox', { name: /billing:access/i })
    ).not.toBeInTheDocument()
  })
})
