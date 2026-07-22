/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PermissionMatrix } from './permission-matrix'

describe('PermissionMatrix', () => {
  it('grants every key for a module when Full is checked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<PermissionMatrix value={[]} onChange={onChange} />)

    await user.click(
      screen.getByRole('checkbox', { name: 'Full access to Items' })
    )

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith([
      'items.view',
      'items.create',
      'items.edit',
      'items.delete',
    ])
  })

  it('adds a single action key without wiping other selections', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<PermissionMatrix value={['packages.view']} onChange={onChange} />)

    await user.click(screen.getByRole('checkbox', { name: 'Edit Packages' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(['packages.view', 'packages.edit'])
  })

  it('clears a module when Full is unchecked from a fully selected state', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <PermissionMatrix
        value={[
          'items.view',
          'items.create',
          'items.edit',
          'items.delete',
          'packages.view',
        ]}
        onChange={onChange}
      />
    )

    await user.click(
      screen.getByRole('checkbox', { name: 'Full access to Items' })
    )

    expect(onChange).toHaveBeenCalledWith(['packages.view'])
  })

  it('exposes extras (import/export) and writes the extra permission key', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<PermissionMatrix value={[]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '+2 more' }))
    await user.click(screen.getByText('Import customers'))

    expect(onChange).toHaveBeenCalledWith(['customers.import'])
  })

  it('does not fire onChange for read-only matrices', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <PermissionMatrix value={['items.view']} onChange={onChange} readOnly />
    )

    const checkbox = screen.getByRole('checkbox', { name: 'View Items' })
    expect(checkbox).toHaveAttribute('aria-disabled', 'true')

    await user.click(checkbox)

    expect(onChange).not.toHaveBeenCalled()
  })
})
