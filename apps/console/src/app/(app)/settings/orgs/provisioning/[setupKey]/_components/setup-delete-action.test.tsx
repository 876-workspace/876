/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AdminProvisioningSetup } from '@876/platform/compat'

import { SetupDeleteAction } from './setup-delete-action'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/lib/client', () => ({
  client: {
    provisioningSetups: {
      del: vi.fn().mockResolvedValue({ data: {}, error: null }),
      purge: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}))

const mockSetup: AdminProvisioningSetup = {
  id: 'setup_123',
  object: 'provisioning_setup',
  key: 'test_setup',
  name: 'Test Setup',
  description: 'A test setup',
  status: 'active',
  is_default: false,
  country_code: 'JM',
  currency_code: 'JMD',
  manifest_target: 'finance/test_setup',
  published_revision: 1,
  has_draft: false,
  organization_count: 0,
  created_at: 1700000000,
  updated_at: 1700000000,
}

describe('SetupDeleteAction', () => {
  it('renders delete and purge actions', async () => {
    const user = userEvent.setup()

    render(<SetupDeleteAction setup={mockSetup} />)

    const trigger = screen.getByRole('button', {
      name: 'More actions for Test Setup',
    })
    expect(trigger).toBeInTheDocument()

    await user.click(trigger)

    const deleteOption = await screen.findByRole('menuitem', {
      name: /Delete setup/i,
    })
    expect(deleteOption).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: /Purge setup/i })
    ).toBeInTheDocument()

    await user.click(deleteOption)

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Delete setup?' })
    ).toBeInTheDocument()
  })

  it('disables delete and purge when setup is default', async () => {
    const user = userEvent.setup()

    render(<SetupDeleteAction setup={{ ...mockSetup, is_default: true }} />)

    const trigger = screen.getByRole('button', {
      name: 'More actions for Test Setup',
    })
    await user.click(trigger)

    const deleteOption = await screen.findByRole('menuitem', {
      name: /Delete setup/i,
    })
    expect(deleteOption).toHaveAttribute('aria-disabled', 'true')
    expect(
      screen.getByRole('menuitem', { name: /Purge setup/i })
    ).toHaveAttribute('aria-disabled', 'true')
  })
})
