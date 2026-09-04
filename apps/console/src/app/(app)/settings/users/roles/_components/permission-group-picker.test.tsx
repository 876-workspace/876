/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { PermissionGroup } from '@/types/permission'

import { PermissionGroupPicker } from './permission-group-picker'

const GROUPS: PermissionGroup[] = [
  {
    label: 'CRM · Requests',
    permissions: [
      { value: 'crm/requests.view', label: 'View' },
      { value: 'crm/requests.edit', label: 'Edit' },
    ],
  },
  {
    label: 'Billing · Customers',
    permissions: [{ value: 'billing/customers.view', label: 'View' }],
  },
]

describe('PermissionGroupPicker', () => {
  it('renders a trigger with the group label and its checked/total count', () => {
    render(
      <PermissionGroupPicker
        groups={GROUPS}
        selected={new Set()}
        onToggle={vi.fn()}
      />
    )

    expect(screen.getByText('CRM · Requests')).toBeInTheDocument()
    expect(screen.getByText('0/2')).toBeInTheDocument()
    expect(screen.getByText('Billing · Customers')).toBeInTheDocument()
    expect(screen.getByText('0/1')).toBeInTheDocument()
  })

  it('reflects the current selection in each group count', () => {
    render(
      <PermissionGroupPicker
        groups={GROUPS}
        selected={new Set(['crm/requests.view'])}
        onToggle={vi.fn()}
      />
    )

    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  it('starts every group collapsed, so no permission pill is in the document', () => {
    render(
      <PermissionGroupPicker
        groups={GROUPS}
        selected={new Set()}
        onToggle={vi.fn()}
      />
    )

    expect(screen.queryByRole('button', { name: 'View' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
  })

  it("reveals a group's pills only after its trigger is opened", async () => {
    const user = userEvent.setup()
    render(
      <PermissionGroupPicker
        groups={GROUPS}
        selected={new Set()}
        onToggle={vi.fn()}
      />
    )

    await user.click(screen.getByText('CRM · Requests'))

    // Only the opened group's pills are in the document; the other group's
    // single "View" pill has not been mounted yet.
    expect(screen.getAllByRole('button', { name: 'View' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('allows more than one group to be open at once', async () => {
    const user = userEvent.setup()
    render(
      <PermissionGroupPicker
        groups={GROUPS}
        selected={new Set()}
        onToggle={vi.fn()}
      />
    )

    await user.click(screen.getByText('CRM · Requests'))
    await user.click(screen.getByText('Billing · Customers'))

    expect(screen.getAllByRole('button', { name: 'View' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('calls onToggle with the exact permission value when a pill is clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(
      <PermissionGroupPicker
        groups={GROUPS}
        selected={new Set()}
        onToggle={onToggle}
      />
    )

    await user.click(screen.getByText('CRM · Requests'))
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith('crm/requests.edit')
  })

  it('marks a selected permission pill as pressed', async () => {
    const user = userEvent.setup()
    render(
      <PermissionGroupPicker
        groups={GROUPS}
        selected={new Set(['crm/requests.edit'])}
        onToggle={vi.fn()}
      />
    )

    await user.click(screen.getByText('CRM · Requests'))

    expect(screen.getByRole('button', { name: 'Edit' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('does not bold the group trigger label', () => {
    render(
      <PermissionGroupPicker
        groups={GROUPS}
        selected={new Set()}
        onToggle={vi.fn()}
      />
    )

    const trigger = screen.getByText('CRM · Requests').closest('button')
    expect(trigger?.className).not.toMatch(/font-(?:medium|semibold|bold)/)
  })
})
