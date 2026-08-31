/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CreateSetupForm } from './create-setup-form'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  push: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('@/lib/client', () => ({
  client: {
    provisioningSetups: {
      create: mocks.create,
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.create.mockResolvedValue({
    data: {
      object: 'provisioning_setup',
      id: 'psu_test',
      key: 'jamaica-special',
      name: 'Jamaica Special',
      description: null,
      country_code: null,
      currency_code: null,
      status: 'active',
      is_default: false,
      manifest_target: 'finance/jamaica-special',
      published_revision: null,
      has_draft: true,
      organization_count: 0,
      created_at: 1,
      updated_at: 1,
    },
    error: null,
  })
})

describe('CreateSetupForm', () => {
  it('uses the canonical country catalog instead of a free-text country field', () => {
    render(<CreateSetupForm />)

    const selector = screen.getByRole('combobox', { name: 'Country to add' })
    expect(selector).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: /Jamaica \(JM\)/i })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('textbox', { name: /country/i })
    ).not.toBeInTheDocument()
  })

  it('creates the initial country, application, Work gate, and Work capability policy together', async () => {
    const user = userEvent.setup()
    render(<CreateSetupForm />)

    await user.type(screen.getByLabelText('Name'), 'Jamaica Special')
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Country to add' }),
      'JM'
    )
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(screen.getByRole('button', { name: 'Create setup' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'jamaica-special',
        name: 'Jamaica Special',
        policy: expect.objectContaining({
          conditions: [
            {
              group_key: 'jm',
              field: 'country',
              operator: 'equals',
              value: 'JM',
              priority: 100,
            },
          ],
          entitlements: expect.arrayContaining([
            expect.objectContaining({
              target_type: 'application',
              target_key: '876-enterprise',
              enabled: true,
            }),
            expect.objectContaining({
              target_type: 'service',
              target_key: 'work',
              enabled: true,
            }),
            expect.objectContaining({
              target_type: 'service_capability',
              target_key: 'work.tasks',
              enabled: true,
            }),
            expect.objectContaining({
              target_type: 'service_capability',
              target_key: 'work.sync',
              enabled: false,
            }),
          ]),
        }),
      })
    )
    expect(mocks.push).toHaveBeenCalledWith(
      '/settings/orgs/provisioning/jamaica-special'
    )
  })

  it('labels Work capabilities separately from application entitlements', () => {
    render(<CreateSetupForm />)

    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(
      screen.getAllByText(
        'Capability available when its shared service is enabled.'
      ).length
    ).toBeGreaterThan(0)
    expect(screen.getByText('Work service')).toBeInTheDocument()
    expect(screen.getByText('Shared platform service gate.')).toBeInTheDocument()
  })
})
