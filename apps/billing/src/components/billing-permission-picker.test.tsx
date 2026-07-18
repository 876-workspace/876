/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { Permission } from '@/types/access'

import { PermissionPicker } from './billing-permission-picker'

describe('Billing permission picker', () => {
  it('when a permission is selected, exposes its state and reports the user toggle', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    const selected = new Set<Permission>(['customers:read'])
    render(<PermissionPicker selected={selected} onToggle={onToggle} />)

    const selectedPermission = screen.getByRole('button', {
      name: /View customers/,
    })
    const writablePermission = screen.getByRole('button', {
      name: /Manage customers/,
    })

    expect(selectedPermission).toHaveAttribute('aria-pressed', 'true')
    expect(writablePermission).toHaveAttribute('aria-pressed', 'false')
    await user.click(writablePermission)
    expect(onToggle).toHaveBeenCalledWith('customers:write')
  })

  it('when disabled, prevents permission changes', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(
      <PermissionPicker
        selected={new Set<Permission>()}
        disabled
        onToggle={onToggle}
      />
    )

    await user.click(screen.getByRole('button', { name: /View customers/ }))

    expect(onToggle).not.toHaveBeenCalled()
  })
})
