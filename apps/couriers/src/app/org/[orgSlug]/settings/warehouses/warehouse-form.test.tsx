/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WarehouseView } from '@/types/warehouse'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))

vi.mock('@/components/address-fields', () => ({
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
    line1: '8760 NW 25th Street',
    line2: 'Suite RSJ',
    city: 'Doral',
    countryCode: 'US',
    regionCode: 'US-FL',
    postalCode: '33172',
  }),
  toAddressParams: () => ({
    name: 'Miami Receiving Hub',
    line1: '8760 NW 25th Street',
    city: 'Doral',
    countryCode: 'US',
    regionCode: 'US-FL',
    postalCode: '33172',
  }),
}))

vi.mock('@/lib/client', () => ({
  client: {
    warehouses: { create: mocks.create, update: mocks.update },
  },
}))

import { WarehouseForm } from './warehouse-form'

function createWarehouse(
  overrides: Partial<WarehouseView> = {}
): WarehouseView {
  return {
    id: 'wh_miami',
    tenantId: 'ten_rocketship',
    addressId: 'adr_miami',
    orgLocationId: null,
    name: 'Miami Receiving Hub',
    operatingModel: 'OWNED',
    agentName: null,
    code: null,
    mailboxPlacement: 'ADDRESS_LINE_2',
    mailboxPrefix: null,
    instructions: null,
    isActive: true,
    isPrimary: true,
    address: {
      id: 'adr_miami',
      tenantId: 'ten_rocketship',
      name: 'Miami Receiving Hub',
      line1: '8760 NW 25th Street',
      line2: 'Suite RSJ',
      city: 'Doral',
      regionCode: 'US-FL',
      regionName: 'Florida',
      countryCode: 'US',
      postalCode: '33172',
      latitude: null,
      longitude: null,
      isActive: true,
      createdAt: 1_784_419_200,
      updatedAt: 1_784_419_200,
    },
    createdAt: 1_784_419_200,
    updatedAt: 1_784_419_200,
    ...overrides,
  }
}

describe('WarehouseForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue({ data: { id: 'wh_new' }, error: null })
    mocks.update.mockResolvedValue({ data: createWarehouse(), error: null })
  })

  it('submits an agent warehouse through the typed browser client then returns to its list', async () => {
    const user = userEvent.setup({ delay: null })

    render(<WarehouseForm orgSlug="island-logistics" />)

    await user.type(
      screen.getByLabelText('Warehouse name'),
      'Miami Receiving Hub'
    )
    await user.click(screen.getByRole('combobox', { name: 'Operating model' }))
    await user.click(
      await screen.findByRole('option', {
        name: 'A receiving agent operates it',
      })
    )
    await user.type(screen.getByLabelText('Agent name'), 'Caribbean Receiving')
    await user.type(screen.getByLabelText('Warehouse code'), 'jmc')
    await user.click(
      screen.getByRole('checkbox', { name: 'Set as primary warehouse' })
    )
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith('island-logistics', {
      name: 'Miami Receiving Hub',
      isPrimary: true,
      operatingModel: 'AGENT',
      agentName: 'Caribbean Receiving',
      code: 'JMC',
      mailboxPlacement: 'ADDRESS_LINE_2',
      mailboxPrefix: '',
      instructions: '',
      address: {
        name: 'Miami Receiving Hub',
        line1: '8760 NW 25th Street',
        city: 'Doral',
        countryCode: 'US',
        regionCode: 'US-FL',
        postalCode: '33172',
      },
    })
    expect(mocks.push).toHaveBeenCalledWith(
      '/org/island-logistics/settings/warehouses'
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('hides the agent-name input when switching back to an owned warehouse', async () => {
    const user = userEvent.setup({ delay: null })

    render(
      <WarehouseForm
        orgSlug="island-logistics"
        warehouse={createWarehouse({
          operatingModel: 'AGENT',
          agentName: 'Caribbean Receiving',
        })}
      />
    )

    await user.click(screen.getByRole('combobox', { name: 'Operating model' }))
    await user.click(
      await screen.findByRole('option', { name: 'We operate this warehouse' })
    )

    expect(screen.queryByLabelText('Agent name')).not.toBeInTheDocument()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('defaults mailbox placement to its own line and submits the selected placement', async () => {
    const user = userEvent.setup({ delay: null })

    render(<WarehouseForm orgSlug="island-logistics" />)

    expect(screen.getByRole('combobox', { name: 'Mailbox number placement' })).toHaveTextContent(
      'On its own line'
    )
    await user.type(
      screen.getByLabelText('Warehouse name'),
      'Miami Receiving Hub'
    )
    await user.click(
      screen.getByRole('combobox', { name: 'Mailbox number placement' })
    )
    await user.click(
      await screen.findByRole('option', { name: 'On the street line' })
    )
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith('island-logistics', {
      name: 'Miami Receiving Hub',
      isPrimary: false,
      operatingModel: 'OWNED',
      code: '',
      mailboxPlacement: 'ADDRESS_LINE_1',
      mailboxPrefix: '',
      instructions: '',
      address: {
        name: 'Miami Receiving Hub',
        line1: '8760 NW 25th Street',
        city: 'Doral',
        countryCode: 'US',
        regionCode: 'US-FL',
        postalCode: '33172',
      },
    })
  })

  it('keeps a current primary warehouse primary without rendering a checkbox', () => {
    render(
      <WarehouseForm orgSlug="island-logistics" warehouse={createWarehouse()} />
    )

    expect(
      screen.getByText(
        'This is the primary warehouse. Promote another warehouse to change it.'
      )
    ).toBeVisible()
    expect(
      screen.queryByRole('checkbox', { name: 'Set as primary warehouse' })
    ).not.toBeInTheDocument()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
