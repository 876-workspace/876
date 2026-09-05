/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PermissionGroup } from '@/types/permission'
import { PermissionGroupPicker } from './permission-group-picker'

const GROUPS: PermissionGroup[] = [
  {
    key: 'crm',
    label: '876 CRM',
    modules: [
      {
        key: 'requests',
        label: 'Requests',
        permissions: [
          { value: 'crm/requests.view', label: 'View' },
          { value: 'crm/requests.edit', label: 'Edit' },
        ],
      },
      {
        key: 'customers',
        label: 'Customers',
        permissions: [{ value: 'crm/customers.view', label: 'View' }],
      },
    ],
  },
]

function renderPicker(selected = new Set<string>()) {
  const onToggle = vi.fn()
  const onSetGroup = vi.fn()
  render(
    <PermissionGroupPicker
      groups={GROUPS}
      selected={selected}
      onToggle={onToggle}
      onSetGroup={onSetGroup}
    />
  )
  return { onToggle, onSetGroup }
}

describe('PermissionGroupPicker', () => {
  it('renders a product trigger with its rolled-up count', () => {
    renderPicker()
    expect(screen.getByText('876 CRM')).toBeInTheDocument()
    expect(screen.getByText('0/3')).toBeInTheDocument()
  })
  it('starts products collapsed', () => {
    renderPicker()
    expect(screen.queryByText('Requests')).not.toBeInTheDocument()
  })
  it('reveals modules after its product is opened', async () => {
    const user = userEvent.setup()
    renderPicker()
    await user.click(screen.getByText('876 CRM'))
    expect(screen.getByText('Requests')).toBeInTheDocument()
    expect(screen.getByText('Customers')).toBeInTheDocument()
  })
  it('renders module counts after a product is opened', async () => {
    const user = userEvent.setup()
    renderPicker(new Set(['crm/requests.view']))
    await user.click(screen.getByText('876 CRM'))
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('0/1')).toBeInTheDocument()
  })
  it('reveals permissions only after its module is opened', async () => {
    const user = userEvent.setup()
    renderPicker()
    await user.click(screen.getByText('876 CRM'))
    await user.click(screen.getByText('Requests'))
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })
  it('toggles the exact durable permission key', async () => {
    const user = userEvent.setup()
    const { onToggle } = renderPicker()
    await user.click(screen.getByText('876 CRM'))
    await user.click(screen.getByText('Requests'))
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onToggle).toHaveBeenCalledWith('crm/requests.edit')
  })
  it('marks selected permissions as pressed', async () => {
    const user = userEvent.setup()
    renderPicker(new Set(['crm/requests.edit']))
    await user.click(screen.getByText('876 CRM'))
    await user.click(screen.getByText('Requests'))
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })
  it('offers product-level select all', async () => {
    const user = userEvent.setup()
    const { onSetGroup } = renderPicker()
    await user.click(screen.getByText('876 CRM'))
    await user.click(screen.getByRole('button', { name: 'Select all' }))
    expect(onSetGroup).toHaveBeenCalledWith(GROUPS[0], true)
  })
  it('offers product-level clear', async () => {
    const user = userEvent.setup()
    const { onSetGroup } = renderPicker()
    await user.click(screen.getByText('876 CRM'))
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onSetGroup).toHaveBeenCalledWith(GROUPS[0], false)
  })
  it('exposes a partial product selection state', async () => {
    const user = userEvent.setup()
    renderPicker(new Set(['crm/requests.view']))
    await user.click(screen.getByText('876 CRM'))
    expect(
      screen.getByLabelText('876 CRM partially selected')
    ).toBeInTheDocument()
  })
})
