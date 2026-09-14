import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AdminApplicationModule } from '@876/platform/compat'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const moduleClient = vi.hoisted(() => ({
  archive: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  client: { modules: moduleClient },
}))

import { ModulesManager } from './modules-manager'

const MODULE: AdminApplicationModule = {
  object: 'application_module',
  id: 'mod_invoices',
  app_id: 'app_invoice',
  key: 'invoices',
  name: 'Invoices',
  description: 'Create, issue, and manage customer invoices.',
  feature_id: null,
  feature_slug: null,
  status: 'active',
  position: 10,
  created_at: 1_700_000_000,
  updated_at: 1_700_000_000,
}

const LEGACY_MODULE: AdminApplicationModule = {
  ...MODULE,
  id: 'mod_sales',
  app_id: 'app_billing',
  key: 'sales',
  name: 'Sales',
  description: 'Quotes, estimates, invoices, payments, and credit notes.',
  feature_id: 'feature_sales',
  feature_slug: 'billing-sales',
}

function renderManager(
  registryManaged: boolean,
  module: AdminApplicationModule = MODULE
) {
  return render(
    <ModulesManager
      context={{
        appId: module.app_id,
        canManage: true,
        registryManaged,
        registryModuleKeys: registryManaged ? ['invoices'] : [],
        registryModules: registryManaged
          ? [
              {
                key: 'invoices',
                name: 'Invoices',
                description: MODULE.description ?? '',
              },
            ]
          : [],
      }}
      modules={{ data: [module], error: null }}
      features={{ data: [], error: null }}
    />
  )
}

describe('ModulesManager registry ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    moduleClient.update.mockResolvedValue({ data: MODULE, error: null })
    moduleClient.create.mockResolvedValue({ data: MODULE, error: null })
    moduleClient.archive.mockResolvedValue({
      data: { object: 'application_module', id: MODULE.id, deleted: true },
      error: null,
    })
  })

  it('hides manual module creation for a registry-managed app', () => {
    // ARRANGE / ACT
    renderManager(true)

    // ASSERT
    expect(screen.getByText('Registry managed')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Add' })
    ).not.toBeInTheDocument()
  })

  it('keeps canonical key, name and description read-only while editing', async () => {
    // ARRANGE
    const user = userEvent.setup()
    renderManager(true)

    // ACT
    await user.click(screen.getByRole('button', { name: 'Edit Invoices' }))

    // ASSERT
    expect(screen.getByLabelText('Stable key')).toBeDisabled()
    expect(screen.getByLabelText('Name')).toBeDisabled()
    expect(screen.getByLabelText('Description')).toBeDisabled()
    expect(
      screen.getByText(/come from the application module registry/i)
    ).toBeInTheDocument()
  })

  it('updates only operator-owned fields for a registry-managed module', async () => {
    // ARRANGE
    const user = userEvent.setup()
    renderManager(true)
    await user.click(screen.getByRole('button', { name: 'Edit Invoices' }))

    // ACT
    await user.click(screen.getByRole('button', { name: 'Save module' }))

    // ASSERT
    await waitFor(() => {
      expect(moduleClient.update).toHaveBeenCalledTimes(1)
    })
    expect(moduleClient.update).toHaveBeenCalledWith('mod_invoices', {
      feature_id: null,
      position: 10,
    })
    expect(moduleClient.create).not.toHaveBeenCalled()
  })

  it('keeps transitional non-registry module identity editable', async () => {
    // ARRANGE
    const user = userEvent.setup()
    renderManager(true, LEGACY_MODULE)

    // ACT
    await user.click(screen.getByRole('button', { name: 'Edit Sales' }))

    // ASSERT
    expect(screen.getByLabelText('Name')).not.toBeDisabled()
    expect(screen.getByLabelText('Description')).not.toBeDisabled()
    expect(
      screen.queryByText(/come from the application module registry/i)
    ).not.toBeInTheDocument()
  })

  it('retains manual creation for product apps without a canonical registry', () => {
    // ARRANGE / ACT
    renderManager(false)

    // ASSERT
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
    expect(screen.queryByText('Registry managed')).not.toBeInTheDocument()
  })

  it('shows declared registry capabilities without making them editable commercial modules', () => {
    render(
      <ModulesManager
        context={{
          appId: 'app_commerce',
          canManage: true,
          registryManaged: true,
          registryModuleKeys: ['catalog', 'orders'],
          registryModules: [
            {
              key: 'catalog',
              name: 'Catalog',
              description: 'Manage products and merchandising.',
            },
            {
              key: 'orders',
              name: 'Orders',
              description: 'Manage customer orders.',
            },
          ],
        }}
        modules={{ data: [], error: null }}
        features={{ data: [], error: null }}
      />
    )

    expect(screen.getByText('Declared capabilities')).toBeInTheDocument()
    expect(screen.getByText('Catalog')).toBeInTheDocument()
    expect(screen.getByText('Orders')).toBeInTheDocument()
    expect(screen.getAllByText('Declared only')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /Edit Catalog/i })).toBeNull()
  })

  it('does not duplicate a materialized registry module in declared-only capabilities', () => {
    renderManager(true)

    expect(screen.queryByText('Declared capabilities')).not.toBeInTheDocument()
  })

  it('blocks saving when rollout options fail so an existing association cannot be cleared', async () => {
    const user = userEvent.setup()
    render(
      <ModulesManager
        context={{
          appId: LEGACY_MODULE.app_id,
          canManage: true,
          registryManaged: true,
          registryModuleKeys: ['subscriptions'],
          registryModules: [
            {
              key: 'subscriptions',
              name: 'Subscriptions',
              description: 'Recurring billing.',
            },
          ],
        }}
        modules={{ data: [LEGACY_MODULE], error: null }}
        features={{
          data: null,
          error: {
            code: 'api/unavailable',
            message: 'Rollout flags unavailable.',
          },
        }}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Edit Sales' }))
    expect(screen.getByText('Rollout flags unavailable.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save module' })).toBeDisabled()
    expect(moduleClient.update).not.toHaveBeenCalled()
  })
})
