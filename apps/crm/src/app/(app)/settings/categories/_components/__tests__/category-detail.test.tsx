// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import type { CrmRequestCategory, RequestPriority } from '@/types/crm'
import { CategoryDetail } from '../category-detail'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  createSub: vi.fn(),
  updateSub: vi.fn(),
  deleteSub: vi.fn(),
  onClose: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))

vi.mock('@/lib/client', () => ({
  client: {
    requestCategories: {
      update: mocks.update,
      delete: mocks.delete,
      subcategories: {
        create: mocks.createSub,
        update: mocks.updateSub,
        delete: mocks.deleteSub,
      },
    },
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function aCategory(
  overrides: Partial<CrmRequestCategory> = {}
): CrmRequestCategory {
  return {
    object: 'request_category',
    id: 'cat_1',
    tenantId: 'org_1',
    provisioningKey: null,
    name: 'Billing & Subscriptions',
    slug: 'billing-subscriptions',
    description: 'Invoices, refunds, and plan changes',
    color: 'emerald',
    icon: 'billing',
    sortOrder: 10,
    isActive: true,
    defaultTeamId: 'team_1',
    defaultPriorityId: 'pri_1',
    createdBy: 'user_1',
    createdAt: 1788000000,
    updatedAt: 1788000000,
    deletedAt: null,
    deletedBy: null,
    subcategories: [
      {
        object: 'request_subcategory',
        id: 'sub_1',
        tenantId: 'org_1',
        categoryId: 'cat_1',
        provisioningKey: null,
        name: 'Refund Request',
        slug: 'refund-request',
        description: null,
        icon: 'receipt',
        sortOrder: 10,
        isActive: true,
        defaultTeamId: null,
        defaultPriorityId: null,
        createdBy: 'user_1',
        createdAt: 1788000000,
        updatedAt: 1788000000,
        deletedAt: null,
        deletedBy: null,
      },
    ],
    ...overrides,
  }
}

const priorities: RequestPriority[] = [
  {
    object: 'request_priority',
    id: 'pri_1',
    tenantId: 'org_1',
    provisioningKey: null,
    name: 'High',
    slug: 'high',
    description: 'High priority',
    color: 'amber',
    icon: 'alert',
    weight: 50,
    sortOrder: 10,
    isDefault: false,
    isActive: true,
    createdBy: 'user_1',
    createdAt: 1788000000,
    updatedAt: 1788000000,
  },
]

const teamNames = {
  team_1: 'Finance Support',
}

describe('CategoryDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.update.mockResolvedValue({ data: aCategory(), error: null })
    mocks.delete.mockResolvedValue({
      data: { id: 'cat_1', deleted: true },
      error: null,
    })
  })

  it('renders category header and form values in Overview tab', () => {
    render(
      <CategoryDetail
        category={aCategory()}
        priorities={priorities}
        teamNames={teamNames}
        onClose={mocks.onClose}
      />
    )

    expect(
      screen.getAllByText('Billing & Subscriptions').length
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Name')).toHaveValue('Billing & Subscriptions')
    expect(screen.getByLabelText('Description')).toHaveValue(
      'Invoices, refunds, and plan changes'
    )
    expect(screen.getByText('cat_1')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(
      <CategoryDetail
        category={aCategory()}
        priorities={priorities}
        teamNames={teamNames}
        onClose={mocks.onClose}
      />
    )

    fireEvent.click(screen.getByLabelText('Close category details'))
    expect(mocks.onClose).toHaveBeenCalledTimes(1)
  })

  it('allows updating category fields and saving in Overview tab', async () => {
    render(
      <CategoryDetail
        category={aCategory()}
        priorities={priorities}
        teamNames={teamNames}
        onClose={mocks.onClose}
      />
    )

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Billing & Payments' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(mocks.update).toHaveBeenCalledWith('cat_1', {
      name: 'Billing & Payments',
      description: 'Invoices, refunds, and plan changes',
      color: 'emerald',
      icon: 'billing',
      defaultTeamId: 'team_1',
      defaultPriorityId: 'pri_1',
      sortOrder: 10,
      isActive: true,
    })
  })

  it('allows subcategory management in Subcategories tab', async () => {
    render(
      <CategoryDetail
        category={aCategory()}
        priorities={priorities}
        teamNames={teamNames}
        onClose={mocks.onClose}
      />
    )

    const subTab = screen.getByRole('tab', { name: /Subcategories/ })
    fireEvent.click(subTab)

    expect(screen.getByText('Refund Request')).toBeInTheDocument()
    expect(screen.getByLabelText('Edit Refund Request')).toBeInTheDocument()
    expect(screen.getByLabelText('Delete Refund Request')).toBeInTheDocument()
  })
})
