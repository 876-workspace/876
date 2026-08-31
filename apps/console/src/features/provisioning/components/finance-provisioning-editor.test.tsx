/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminProvisioningCatalog } from '@876/platform/compat'

import { FinanceProvisioningEditor } from './finance-provisioning-editor'

const resourceApi = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  client: {
    provisioning: {
      replaceDraft: vi.fn(),
      validate: vi.fn(),
      publish: vi.fn(),
    },
    provisioningSetups: {
      replaceDraft: vi.fn(),
      validate: vi.fn(),
      publish: vi.fn(),
      resources: { forType: vi.fn(() => resourceApi) },
    },
  },
}))

const testCatalog: AdminProvisioningCatalog = {
  object: 'provisioning_catalog',
  manifest_version: 1,
  target_type: 'finance',
  resource_types: [
    {
      resource_type: 'workspace',
      label: 'Workspace',
      description: 'Workspace preferences',
      multiple: false,
      minimum_items: 1,
      maximum_items: 1,
      fields: [
        {
          key: 'name',
          label: 'Workspace name',
          value_type: 'string',
          required: true,
          reference_namespace: null,
          allowed_values: null,
        },
      ],
    },
    {
      resource_type: 'currency',
      label: 'Currencies',
      description: 'Currency defaults',
      multiple: true,
      minimum_items: 1,
      maximum_items: null,
      fields: [
        {
          key: 'code',
          label: 'ISO code',
          value_type: 'string',
          required: true,
          reference_namespace: null,
          allowed_values: null,
        },
        {
          key: 'minorUnit',
          label: 'Minor unit',
          value_type: 'integer',
          required: true,
          reference_namespace: null,
          allowed_values: null,
        },
      ],
    },
    {
      resource_type: 'tax_rate',
      label: 'Tax rates',
      description: 'Tax defaults',
      multiple: true,
      minimum_items: 1,
      maximum_items: null,
      fields: [
        {
          key: 'rate',
          label: 'Rate',
          value_type: 'decimal',
          required: true,
          reference_namespace: null,
          allowed_values: null,
        },
      ],
    },
    {
      resource_type: 'invoice_preference',
      label: 'Invoice preferences',
      description: 'Invoice preferences',
      multiple: false,
      minimum_items: 1,
      maximum_items: 1,
      fields: [
        {
          key: 'defaultTaxBehavior',
          label: 'Tax behavior',
          value_type: 'string',
          required: true,
          reference_namespace: null,
          allowed_values: ['EXCLUSIVE', 'INCLUSIVE'],
        },
      ],
    },
  ],
}

describe('FinanceProvisioningEditor', () => {
  function resource(
    key: string,
    code: string,
    minorUnit: string,
    id = `resource_${key}`
  ) {
    return {
      data: {
        id,
        object: 'provisioning_resource',
        resource_type: 'currency',
        key,
        position: 10,
        properties: [
          {
            key: 'code',
            value_type: 'string',
            string_value: code,
            integer_value: null,
            decimal_value: null,
            boolean_value: null,
            reference_namespace: null,
            reference_key: null,
          },
          {
            key: 'minorUnit',
            value_type: 'integer',
            string_value: null,
            integer_value: minorUnit,
            decimal_value: null,
            boolean_value: null,
            reference_namespace: null,
            reference_key: null,
          },
        ],
      },
      error: null,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders horizontal category tabs and switches categories', async () => {
    const user = userEvent.setup()

    render(
      <FinanceProvisioningEditor
        catalog={testCatalog}
        manifest={null}
        target={{ type: 'finance', key: 'jamaica' }}
      />
    )

    // Check category tabs are rendered
    const nav = screen.getByRole('navigation', {
      name: 'Provisioning resource categories',
    })
    expect(nav).toBeInTheDocument()

    const workspaceTab = screen.getByRole('button', { name: /Workspace/ })
    const currenciesTab = screen.getByRole('button', { name: /Currencies/ })
    const taxRatesTab = screen.getByRole('button', { name: /Tax rates/ })

    expect(workspaceTab).toBeInTheDocument()
    expect(currenciesTab).toBeInTheDocument()
    expect(taxRatesTab).toBeInTheDocument()

    // Default selected category is Workspace
    expect(screen.getByLabelText(/Workspace name/)).toBeInTheDocument()

    // Switch to Currencies
    await user.click(currenciesTab)
    expect(screen.getByText('No currencies configured')).toBeInTheDocument()

    // Switch to Tax rates
    await user.click(taxRatesTab)
    expect(screen.getByText('No tax rates configured')).toBeInTheDocument()
  })

  it('renders clean count pills and add button for collections', () => {
    render(
      <FinanceProvisioningEditor
        catalog={testCatalog}
        manifest={null}
        target={{ type: 'finance', key: 'jamaica' }}
        initialType="currency"
      />
    )

    // Add button is present in toolbar and empty collection state
    const addButtons = screen.getAllByRole('button', { name: /Add/ })
    expect(addButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('adds and edits typed collection rows inline without a drawer', async () => {
    const user = userEvent.setup()
    resourceApi.create.mockResolvedValueOnce(resource('usd', 'USD', '2'))
    resourceApi.update.mockResolvedValueOnce(resource('usd', 'CAD', '2'))

    render(
      <FinanceProvisioningEditor
        catalog={testCatalog}
        manifest={null}
        target={{ type: 'finance', key: 'jamaica' }}
        initialType="currency"
      />
    )

    const toolbarAddButton = screen.getAllByRole('button', { name: /Add/ })[0]!
    await user.click(toolbarAddButton)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const codeInput = screen.getByRole('textbox', { name: 'ISO code' })
    const minorUnitInput = screen.getByRole('spinbutton', {
      name: 'Minor unit',
    })
    expect(codeInput).toBeInTheDocument()
    expect(minorUnitInput).toBeInTheDocument()

    await user.type(codeInput, 'USD')
    await user.type(minorUnitInput, '2')
    await user.click(screen.getByRole('button', { name: 'Save currency' }))

    expect(await screen.findByText('USD')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(resourceApi.create).toHaveBeenCalledWith('jamaica', {
      key: 'usd',
      properties: expect.arrayContaining([
        expect.objectContaining({ key: 'code', string_value: 'USD' }),
        expect.objectContaining({ key: 'minorUnit', integer_value: '2' }),
      ]),
    })

    const editButton = screen.getByRole('button', { name: 'Edit currency' })
    const deleteButton = screen.getByRole('button', {
      name: 'Delete currency',
    })
    expect(deleteButton).toHaveClass('text-destructive')
    expect(deleteButton.parentElement).toHaveClass('opacity-0')

    await user.click(editButton)
    const editCodeInput = screen.getByRole('textbox', { name: 'ISO code' })
    await user.clear(editCodeInput)
    await user.type(editCodeInput, 'CAD')
    await user.click(screen.getByRole('button', { name: 'Save currency' }))

    expect(await screen.findByText('CAD')).toBeInTheDocument()
    expect(screen.queryByText('USD')).not.toBeInTheDocument()
    expect(resourceApi.update).toHaveBeenCalledWith('jamaica', 'usd', {
      properties: expect.arrayContaining([
        expect.objectContaining({ key: 'code', string_value: 'CAD' }),
      ]),
    })
  })

  it('does not render toolbar section on workspace tab', () => {
    render(
      <FinanceProvisioningEditor
        catalog={testCatalog}
        manifest={null}
        target={{ type: 'finance', key: 'jamaica' }}
      />
    )

    expect(
      screen.queryByLabelText('More provisioning actions')
    ).not.toBeInTheDocument()
  })

  it('renders singleton preference tab with Title Case option labels and no Workspace defaults title', () => {
    render(
      <FinanceProvisioningEditor
        catalog={testCatalog}
        manifest={null}
        target={{ type: 'finance', key: 'jamaica' }}
        initialType="invoice_preference"
      />
    )

    expect(screen.getByText('Tax behavior')).toBeInTheDocument()
    expect(screen.queryByText('Workspace defaults')).not.toBeInTheDocument()

    // Allowed values options are formatted in Title Case
    expect(screen.getByText('Exclusive')).toBeInTheDocument()
    expect(screen.getByText('Inclusive')).toBeInTheDocument()
  })
})
