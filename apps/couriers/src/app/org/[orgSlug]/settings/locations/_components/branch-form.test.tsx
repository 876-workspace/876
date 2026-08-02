/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { BranchView } from '@/types/branch'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))

vi.mock('@/components/patterns/address-fields', () => ({
  AddressFields: () => <div>Address fields</div>,
  emptyAddressValue: () => ({
    line1: '',
    line2: '',
    city: '',
    countryCode: 'JM',
    regionCode: '',
    postalCode: '',
  }),
  toAddressFieldsValue: () => ({
    line1: '12 Hope Road',
    line2: '',
    city: 'Kingston',
    countryCode: 'JM',
    regionCode: 'JM-01',
    postalCode: '',
  }),
  toAddressParams: () => ({
    name: 'Kingston Branch',
    line1: '12 Hope Road',
    city: 'Kingston',
    countryCode: 'JM',
    regionCode: 'JM-01',
  }),
}))

vi.mock('@/lib/client', () => ({
  client: {
    branches: { create: mocks.create, update: mocks.update },
  },
}))

import { BranchForm } from './branch-form'

function createBranch(overrides: Partial<BranchView> = {}): BranchView {
  return {
    id: 'br_kingston',
    tenantId: 'ten_rocketship',
    addressId: 'adr_kingston',
    orgLocationId: null,
    name: 'Kingston Branch',
    phone: null,
    isDefault: false,
    isActive: true,
    address: {
      id: 'adr_kingston',
      tenantId: 'ten_rocketship',
      name: 'Kingston Branch',
      line1: '12 Hope Road',
      line2: null,
      city: 'Kingston',
      regionCode: 'JM-01',
      regionName: 'Kingston',
      countryCode: 'JM',
      postalCode: null,
      latitude: null,
      longitude: null,
      isActive: true,
      createdAt: 1_784_419_200,
      updatedAt: 1_784_419_200,
    },
    createdAt: 1_784_419_200,
    updatedAt: 1_784_419_200,
    ...overrides,
  } as BranchView
}

describe('BranchForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue({ data: { id: 'br_new' }, error: null })
    mocks.update.mockResolvedValue({ data: createBranch(), error: null })
  })

  it('submits a typed phone number recombined into its dialling code', async () => {
    const user = userEvent.setup({ delay: null })

    render(<BranchForm orgSlug="island-logistics" />)

    await user.type(screen.getByLabelText('Branch name'), 'Kingston Branch')
    await user.type(screen.getByLabelText('Phone'), '8765555555')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith('island-logistics', {
      name: 'Kingston Branch',
      phone: '+18765555555',
      isDefault: false,
      isActive: true,
      address: {
        name: 'Kingston Branch',
        line1: '12 Hope Road',
        city: 'Kingston',
        countryCode: 'JM',
        regionCode: 'JM-01',
      },
    })
    expect(mocks.push).toHaveBeenCalledWith(
      '/org/island-logistics/settings/locations'
    )
  })

  it('omits the phone entirely when the number is left blank', async () => {
    const user = userEvent.setup({ delay: null })

    render(<BranchForm orgSlug="island-logistics" />)

    await user.type(screen.getByLabelText('Branch name'), 'Kingston Branch')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create.mock.calls[0]?.[1]).not.toHaveProperty('phone')
  })

  it('splits a stored number so the national part alone is editable', () => {
    render(
      <BranchForm
        orgSlug="island-logistics"
        branch={createBranch({ phone: '+18765555555' })}
      />
    )

    expect(screen.getByLabelText('Phone')).toHaveValue('8765555555')
  })

  it('clears a stored phone to null rather than an empty string', async () => {
    const user = userEvent.setup({ delay: null })

    render(
      <BranchForm
        orgSlug="island-logistics"
        branch={createBranch({ phone: '+18765555555' })}
      />
    )

    await user.clear(screen.getByLabelText('Phone'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update.mock.calls[0]?.[2]).toMatchObject({ phone: null })
  })

  it('leaves an unparseable legacy phone untouched when another field is edited', async () => {
    const user = userEvent.setup({ delay: null })

    render(
      <BranchForm
        orgSlug="island-logistics"
        branch={createBranch({ phone: '555-1234' })}
      />
    )

    await user.type(screen.getByLabelText('Branch name'), ' West')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update.mock.calls[0]?.[2]).toMatchObject({ phone: '555-1234' })
  })

  it('recomposes a legacy phone once the user actually edits it', async () => {
    const user = userEvent.setup({ delay: null })

    render(
      <BranchForm
        orgSlug="island-logistics"
        branch={createBranch({ phone: '555-1234' })}
      />
    )

    await user.clear(screen.getByLabelText('Phone'))
    await user.type(screen.getByLabelText('Phone'), '8765555555')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update.mock.calls[0]?.[2]).toMatchObject({
      phone: '+18765555555',
    })
  })

  it('marks the branch name required and leaves the phone optional', () => {
    render(<BranchForm orgSlug="island-logistics" />)

    expect(screen.getByLabelText('Branch name')).toBeRequired()
    expect(screen.getByLabelText('Phone')).not.toBeRequired()
  })

  it('renders the address in a tab beside an empty custom-fields tab', async () => {
    const user = userEvent.setup()

    render(<BranchForm orgSlug="island-logistics" />)

    expect(screen.getByText('Address fields')).toBeVisible()

    await user.click(screen.getByRole('tab', { name: 'Custom fields' }))
    expect(screen.getByText('No custom fields yet.')).toBeVisible()
  })
})
