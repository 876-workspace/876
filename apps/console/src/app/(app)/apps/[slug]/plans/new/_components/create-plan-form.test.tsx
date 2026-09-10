import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreatePlanSetup } from '@/types/plans'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}))
vi.mock('@/lib/client', () => ({
  client: { products: { create: mocks.create } },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))

import { CreatePlanForm } from './create-plan-form'

function setup(): CreatePlanSetup {
  return {
    data: {
      appId: 'app_invoice',
      modules: [
        {
          id: 'mod_invoices',
          key: 'invoices',
          name: 'Invoices',
          description: 'Customer invoices',
          feature_slug: null,
          status: 'active',
        },
      ],
    },
    error: null,
  }
}

describe('CreatePlanForm', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.create.mockResolvedValue({
      data: { slug: 'invoice-pro' },
      error: null,
    })
  })

  it('preserves entered details while server options load and submits selected module IDs', async () => {
    const pending = Promise.withResolvers<CreatePlanSetup>()
    const user = userEvent.setup()
    render(<CreatePlanForm appSlug="876-invoice" setup={pending.promise} />)
    await user.type(screen.getByLabelText(/Name/), 'Invoice Pro')
    await user.type(screen.getByLabelText(/Slug/), 'invoice-pro')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByLabelText('Loading modules')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Create plan' })).toBeDisabled()
    await act(async () => pending.resolve(setup()))
    await user.click(screen.getByRole('checkbox', { name: /Invoices/ }))
    await user.click(screen.getByRole('button', { name: 'Create plan' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith({
      name: 'Invoice Pro',
      slug: 'invoice-pro',
      app_id: 'app_invoice',
      module_ids: ['mod_invoices'],
      price: { unit_amount: 0, currency: 'jmd', billing_interval: null },
    })
    expect(mocks.push).toHaveBeenCalledWith(
      '/apps/876-invoice/plans/invoice-pro'
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('shows catalog failures locally and prevents creating a plan from unavailable options', async () => {
    const user = userEvent.setup()
    render(
      <CreatePlanForm
        appSlug="876-invoice"
        setup={{
          data: null,
          error: { code: 'api/unavailable', message: 'Modules unavailable.' },
        }}
      />
    )
    await user.type(screen.getByLabelText(/Name/), 'Invoice Pro')
    await user.type(screen.getByLabelText(/Slug/), 'invoice-pro')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText('Modules unavailable.')).toBeVisible()
    expect(screen.getByText('api/unavailable')).toBeVisible()
    expect(screen.queryByText(/has no modules yet/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create plan' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByLabelText(/Name/)).toHaveValue('Invoice Pro')
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('retains the selection and shows a failed submission without navigating', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'product/conflict', message: 'Plan already exists.' },
    })
    const user = userEvent.setup()
    render(<CreatePlanForm appSlug="876-invoice" setup={setup()} />)
    await user.type(screen.getByLabelText(/Name/), 'Invoice Pro')
    await user.type(screen.getByLabelText(/Slug/), 'invoice-pro')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('checkbox', { name: /Invoices/ }))
    await user.click(screen.getByRole('button', { name: 'Create plan' }))
    expect(await screen.findByText('Plan already exists.')).toBeVisible()
    expect(screen.getByRole('checkbox', { name: /Invoices/ })).toBeChecked()
    expect(mocks.push).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })
})
