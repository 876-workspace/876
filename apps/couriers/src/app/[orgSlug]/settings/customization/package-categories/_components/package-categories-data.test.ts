import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PackageCategory } from '@876/couriers/admin'
import { AppError } from '@876/ui/app-error'

const { mockGetManageContext, mockList } = vi.hoisted(() => ({
  mockGetManageContext: vi.fn(),
  mockList: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mockGetManageContext,
}))

vi.mock('@/lib/services/couriers', () => ({
  couriersOperator: { packageCategories: { list: mockList } },
}))

import { PackageCategoriesData } from './package-categories-data'
import { PackageCategoriesTable } from './package-categories-table'

const TENANT_ID = 'ten_123'

function createCategory(
  overrides: Partial<PackageCategory> = {}
): PackageCategory {
  return {
    object: 'package_category',
    id: 'pcat_fragile',
    tenant_id: TENANT_ID,
    provisioning_key: null,
    name: 'Fragile',
    slug: 'fragile',
    description: null,
    icon: null,
    sort_order: 10,
    is_active: true,
    created_at: 1_784_419_200,
    updated_at: 1_784_419_200,
    deleted_at: null,
    ...overrides,
  }
}

function listPage(data: PackageCategory[], hasMore: boolean) {
  return {
    data: {
      object: 'list',
      data,
      has_more: hasMore,
      total_count: data.length,
      url: `/v1/tenants/${TENANT_ID}/package-categories`,
    },
    error: null,
  }
}

describe('PackageCategories settings page data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetManageContext.mockResolvedValue({
      tenant: { id: TENANT_ID },
      role: 'admin',
    })
    mockList.mockResolvedValue(listPage([createCategory()], false))
  })

  it('requests only active categories when the status filter is active', async () => {
    await PackageCategoriesData({
      orgSlug: 'island-logistics',
      status: 'active',
    })

    expect(mockList).toHaveBeenCalledTimes(1)
    expect(mockList).toHaveBeenCalledWith(TENANT_ID, {
      limit: 100,
      is_active: true,
    })
  })

  it('requests only inactive categories when the status filter is inactive', async () => {
    await PackageCategoriesData({
      orgSlug: 'island-logistics',
      status: 'inactive',
    })

    expect(mockList).toHaveBeenCalledTimes(1)
    expect(mockList).toHaveBeenCalledWith(TENANT_ID, {
      limit: 100,
      is_active: false,
    })
  })

  it('omits the activity filter when the status filter is all', async () => {
    await PackageCategoriesData({ orgSlug: 'island-logistics', status: 'all' })

    expect(mockList).toHaveBeenCalledTimes(1)
    expect(mockList).toHaveBeenCalledWith(TENANT_ID, { limit: 100 })
  })

  it('follows pagination cursors until every page is loaded', async () => {
    const first = createCategory({ id: 'pcat_1', name: 'First' })
    const second = createCategory({ id: 'pcat_2', name: 'Second' })
    mockList
      .mockResolvedValueOnce(listPage([first], true))
      .mockResolvedValueOnce(listPage([second], false))

    const result = await PackageCategoriesData({
      orgSlug: 'island-logistics',
      status: 'all',
    })

    expect(mockList).toHaveBeenCalledTimes(2)
    expect(mockList).toHaveBeenNthCalledWith(1, TENANT_ID, { limit: 100 })
    expect(mockList).toHaveBeenNthCalledWith(2, TENANT_ID, {
      limit: 100,
      starting_after: 'pcat_1',
    })
    expect(result.type).toBe(PackageCategoriesTable)
    expect(result.props.categories).toEqual([first, second])
  })

  it('keeps the table shell behind an error banner when loading fails', async () => {
    mockList.mockResolvedValue({
      data: null,
      error: { code: 'package-category/not-found' },
    })

    const result = await PackageCategoriesData({
      orgSlug: 'island-logistics',
      status: 'all',
    })

    const children = result.props.children as Array<{
      type: unknown
      props: { error?: { code: string } }
    }>
    expect(children[0]?.type).toBe(AppError)
    expect(children[0]?.props.error).toMatchObject({
      code: 'package-category/not-found',
    })
    expect(children[1]?.type).toBe(PackageCategoriesTable)
  })
})
