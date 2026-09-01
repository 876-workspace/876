/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import type { ApplicationProvisioningProfile } from '@876/core/types/application-provisioning-profile'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProfileSettingsForm } from './profile-settings-form'

const mocks = vi.hoisted(() => ({
  replacePolicy: vi.fn(),
  update: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/lib/client', () => ({
  client: {
    applicationProvisioningProfiles: {
      replacePolicy: mocks.replacePolicy,
      update: mocks.update,
    },
  },
}))

const NOW = 1_788_163_200

function profile(
  overrides: Partial<ApplicationProvisioningProfile> = {}
): ApplicationProvisioningProfile {
  return {
    object: 'application_provisioning_profile',
    id: 'apppr_jamaica',
    app_id: 'rap_crm',
    app_slug: '876-crm',
    key: 'jamaica',
    name: 'Jamaica',
    description: null,
    status: 'active',
    is_default: false,
    manifest_target: 'application/876-crm/profiles/jamaica',
    published_revision: 2,
    has_draft: false,
    selection_count: 4,
    conditions: [
      {
        object: 'application_provisioning_profile_condition',
        id: 'apc_jm',
        group_key: 'jamaica',
        field: 'setup',
        operator: 'equals',
        value: 'jamaica',
        priority: 100,
        created_at: NOW,
        updated_at: NOW,
      },
    ],
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.replacePolicy.mockResolvedValue({
    data: {
      object: 'application_provisioning_profile_policy',
      app_id: 'rap_crm',
      app_slug: '876-crm',
      profile_id: 'apppr_jamaica',
      profile_key: 'jamaica',
      conditions: [],
      updated_at: NOW,
    },
    error: null,
  })
  mocks.update.mockResolvedValue({
    data: profile({ is_default: true }),
    error: null,
  })
})

describe('ProfileSettingsForm', () => {
  it('clears routing before promoting a variant to the default profile', async () => {
    const user = userEvent.setup()
    render(<ProfileSettingsForm appId="rap_crm" profile={profile()} />)

    expect(screen.getByLabelText('Condition group')).toHaveValue('jamaica')

    await user.click(
      screen.getByRole('switch', {
        name: 'Make this the default application provisioning profile',
      })
    )

    expect(screen.queryByLabelText('Condition group')).not.toBeInTheDocument()
    expect(
      screen.getByText(/default profile is location-neutral/i)
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.replacePolicy).toHaveBeenCalledTimes(1)
    expect(mocks.replacePolicy).toHaveBeenCalledWith(
      'rap_crm',
      'jamaica',
      { conditions: [] }
    )
    expect(mocks.update).toHaveBeenCalledWith(
      'rap_crm',
      'jamaica',
      expect.objectContaining({
        name: 'Jamaica',
        status: 'active',
        is_default: true,
      })
    )
    expect(mocks.replacePolicy.mock.invocationCallOrder[0]!).toBeLessThan(
      mocks.update.mock.invocationCallOrder[0]!
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('keeps the existing default profile location-neutral and non-demotable', () => {
    render(
      <ProfileSettingsForm
        appId="rap_crm"
        profile={profile({
          id: 'apppr_default',
          key: 'default',
          name: 'Default',
          is_default: true,
          conditions: [],
        })}
      />
    )

    const defaultSwitch = screen.getByRole('switch', {
      name: 'Make this the default application provisioning profile',
    })
    expect(defaultSwitch).toBeChecked()
    expect(defaultSwitch).toHaveAttribute('aria-disabled', 'true')
    expect(screen.queryByRole('button', { name: 'Add condition' })).toBeNull()
  })
})
