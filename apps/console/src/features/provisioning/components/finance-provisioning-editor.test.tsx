/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { AdminProvisioningCatalog } from '@876/platform/compat'

import { FinanceProvisioningEditor } from './finance-provisioning-editor'

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
  ],
}

describe('FinanceProvisioningEditor', () => {
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

  it('opens and closes the slide-over drawer when clicking Add', async () => {
    const user = userEvent.setup()

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

    // Drawer dialog should now be open
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Close the drawer
    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    await user.click(cancelButton)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
