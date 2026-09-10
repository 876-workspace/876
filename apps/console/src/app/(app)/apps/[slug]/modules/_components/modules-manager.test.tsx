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

function renderManager(registryManaged: boolean) {
  return render(
    <ModulesManager
      context={{
        appId: 'app_invoice',
        canManage: true,
        registryManaged,
      }}
      modules={[MODULE]}
      features={[]}
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
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
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

  it('retains manual creation for product apps without a canonical registry', () => {
    // ARRANGE / ACT
    renderManager(false)

    // ASSERT
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
    expect(screen.queryByText('Registry managed')).not.toBeInTheDocument()
  })
})
