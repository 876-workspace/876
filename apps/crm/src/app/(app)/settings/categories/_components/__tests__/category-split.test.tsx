// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import type { CrmRequestCategory, RequestPriority } from '@/types/crm'
import { CategorySplit } from '../category-split'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  createSub: vi.fn(),
  updateSub: vi.fn(),
  deleteSub: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/client', () => ({
  client: {
    requestCategories: {
      create: mocks.create,
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

const categories: CrmRequestCategory[] = [
  aCategory(),
  aCategory({
    id: 'cat_2',
    name: 'Technical Support',
    slug: 'technical-support',
    description: 'Hardware, software and bug reports',
    color: 'blue',
    icon: 'wrench',
    defaultTeamId: null,
    defaultPriorityId: null,
    subcategories: [],
  }),
]

describe('CategorySplit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders categories list in full table mode when no category is selected', () => {
    render(
      <CategorySplit
        categories={categories}
        priorities={priorities}
        teamNames={teamNames}
        selectedId={undefined}
      />
    )

    expect(screen.getByText('Billing & Subscriptions')).toBeInTheDocument()
    expect(screen.getByText('Technical Support')).toBeInTheDocument()
    expect(screen.getByText('Finance Support')).toBeInTheDocument()
    expect(screen.getByText('1 subcategory')).toBeInTheDocument()
    expect(screen.queryByLabelText('Close category details')).toBeNull()
  })

  it('navigates to ?category=<id> when a row is clicked in full table mode', () => {
    render(
      <CategorySplit
        categories={categories}
        priorities={priorities}
        teamNames={teamNames}
        selectedId={undefined}
      />
    )

    fireEvent.click(screen.getByText('Billing & Subscriptions'))
    expect(mocks.push).toHaveBeenCalledWith(
      '/settings/categories?category=cat_1'
    )
  })

  it('renders category detail card to the right when a category is selected', () => {
    render(
      <CategorySplit
        categories={categories}
        priorities={priorities}
        teamNames={teamNames}
        selectedId="cat_1"
      />
    )

    expect(screen.getByLabelText('Close category details')).toBeInTheDocument()
    expect(
      screen.getAllByText('Billing & Subscriptions').length
    ).toBeGreaterThan(0)
    expect(
      screen.getByText('Invoices, refunds, and plan changes')
    ).toBeInTheDocument()
    expect(screen.getByText('cat_1')).toBeInTheDocument()
  })

  it('allows switching between Overview, Subcategories, and Activity tabs in category detail card', () => {
    render(
      <CategorySplit
        categories={categories}
        priorities={priorities}
        teamNames={teamNames}
        selectedId="cat_1"
      />
    )

    // Initial tab is Overview
    expect(screen.getByLabelText('Description')).toHaveValue(
      'Invoices, refunds, and plan changes'
    )

    // Switch to Subcategories tab
    const subcategoriesTab = screen.getByRole('tab', { name: /Subcategories/ })
    fireEvent.click(subcategoriesTab)
    expect(screen.getByText('Refund Request')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Add subcategory' })
    ).toBeInTheDocument()

    // Switch to Activity tab
    const activityTab = screen.getByRole('tab', { name: 'Activity' })
    fireEvent.click(activityTab)
    expect(screen.getByText('Category created')).toBeInTheDocument()
  })

  it('renders category creation card to the right when selectedId="new"', () => {
    render(
      <CategorySplit
        categories={categories}
        priorities={priorities}
        teamNames={teamNames}
        selectedId="new"
      />
    )

    expect(screen.getByLabelText('Close category creation')).toBeInTheDocument()
    expect(screen.getByText('New category')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })

  it('renders empty table when categories list is empty and no category is selected', () => {
    render(
      <CategorySplit
        categories={[]}
        priorities={priorities}
        teamNames={teamNames}
        selectedId={undefined}
      />
    )

    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Subcategories')).toBeInTheDocument()
    expect(screen.getByText('Default team')).toBeInTheDocument()
    expect(screen.getByText('No categories yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toBeInTheDocument()
  })

  it('renders split create card when categories list is empty and selectedId="new"', () => {
    render(
      <CategorySplit
        categories={[]}
        priorities={priorities}
        teamNames={teamNames}
        selectedId="new"
      />
    )

    expect(screen.getByText('Categories')).toBeInTheDocument()
    expect(screen.getByText('No categories yet')).toBeInTheDocument()
    expect(screen.getByText('New category')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })
})
