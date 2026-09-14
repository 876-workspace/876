/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Package } from '@876/couriers/admin'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
    back: vi.fn(),
  }),
}))
vi.mock('@/lib/client', () => ({
  client: { packages: { create: mocks.create, update: mocks.update } },
}))

import { PackageForm } from './package-form'

function packageItem(overrides: Partial<Package> = {}): Package {
  return {
    object: 'package',
    id: 'pkg_1',
    tenant_id: 'ten_1',
    customer_id: 'cpr_1',
    branch_id: null,
    mailbox_id: null,
    category_id: 'pcat_1',
    category: { id: 'pcat_1', name: 'Fragile', slug: 'fragile' },
    tracking_num: 'TRK-1',
    status: 'PRE_ALERT',
    package_type: 'CARTON',
    description: null,
    quantity: 1,
    actual_weight: null,
    collected_at: null,
    created_at: 1,
    updated_at: 1,
    ...overrides,
  }
}

const props = {
  orgSlug: 'island-logistics',
  customers: [{ value: 'cpr_1', label: 'Kimani Grant' }],
  branches: [{ value: 'br_1', label: 'Kingston' }],
  categories: [{ value: 'pcat_1', label: 'Fragile' }],
}

async function select(
  user: ReturnType<typeof userEvent.setup>,
  index: number,
  option: string
) {
  await user.click(screen.getAllByRole('combobox')[index])
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('PackageForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue({ data: { id: 'pkg_new' }, error: null })
    mocks.update.mockResolvedValue({ data: { id: 'pkg_1' }, error: null })
  })

  it('creates a package through the typed client with the exact payload', async () => {
    const user = userEvent.setup({ delay: null })
    render(<PackageForm {...props} />)
    await select(user, 0, 'Kimani Grant')
    await user.type(
      screen.getByPlaceholderText('Carrier tracking number'),
      ' TRK-99 '
    )
    await user.click(screen.getByRole('button', { name: 'Add package' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith('island-logistics', {
      customer_id: 'cpr_1',
      branch_id: null,
      category_id: null,
      tracking_num: 'TRK-99',
      status: 'PRE_ALERT',
      package_type: 'CARTON',
      description: null,
      quantity: 1,
      actual_weight: null,
    })
    expect(mocks.push).toHaveBeenCalledWith(
      '/island-logistics/packages/pkg_new'
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('requires a customer before creating a package', async () => {
    const user = userEvent.setup({ delay: null })
    render(<PackageForm {...props} />)
    await user.click(screen.getByRole('button', { name: 'Add package' }))

    expect(await screen.findByText('Select a customer.')).toBeVisible()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('updates without including customer_id', async () => {
    const user = userEvent.setup({ delay: null })
    render(<PackageForm {...props} pkg={packageItem()} />)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledWith('island-logistics', 'pkg_1', {
      branch_id: null,
      category_id: 'pcat_1',
      tracking_num: 'TRK-1',
      status: 'PRE_ALERT',
      package_type: 'CARTON',
      description: null,
      quantity: 1,
      actual_weight: null,
    })
  })

  it('sends null when editing clears the category', async () => {
    const user = userEvent.setup({ delay: null })
    render(<PackageForm {...props} pkg={packageItem()} />)
    await select(user, 1, 'Uncategorized')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledWith(
      'island-logistics',
      'pkg_1',
      expect.objectContaining({ category_id: null })
    )
  })

  it('renders a client error while leaving the form mounted', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { message: 'Package category is inactive.' },
    })
    const user = userEvent.setup({ delay: null })
    render(<PackageForm {...props} />)
    await select(user, 0, 'Kimani Grant')
    await user.click(screen.getByRole('button', { name: 'Add package' }))

    expect(
      await screen.findByText('Package category is inactive.')
    ).toBeVisible()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add package' })).toBeVisible()
    )
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
