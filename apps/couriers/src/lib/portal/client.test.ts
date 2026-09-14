import { describe, expect, it, vi } from 'vitest'

import type { CouriersClient, PortalPackage } from '@876/couriers'

import {
  listAllPortalPackages,
  toPortalPackageDetail,
  toPortalPackageListItem,
} from './client'

function createPackage(id: string): PortalPackage {
  return {
    object: 'package',
    id,
    tenant_id: 'ten_rocketship',
    customer_id: 'cprof_kimani',
    branch_id: 'br_kingston',
    mailbox_id: 'mbx_rsj1001',
    category: {
      id: 'pcat_fragile',
      name: 'Fragile',
      slug: 'fragile',
    },
    tracking_num: `tracking_${id}`,
    status: 'READY_FOR_PICKUP',
    package_type: 'CARTON',
    description: `Package ${id}`,
    quantity: 1,
    actual_weight: 4.5,
    chargeable_weight: 4.5,
    carrier: { id: 'carrier_fedex', name: 'FedEx' },
    branch: { id: 'br_kingston', name: 'Kingston' },
    mailbox: { id: 'mbx_rsj1001', number: 'RSJ1001' },
    collected_at: null,
    created_at: 1_784_419_200,
    updated_at: 1_784_419_200,
  }
}

function clientWithPackageList(list: ReturnType<typeof vi.fn>): CouriersClient {
  return {
    portal: { packages: { list } },
  } as unknown as CouriersClient
}

describe('portal client', () => {
  it('maps the session package transport to the portal list view', () => {
    expect(toPortalPackageListItem(createPackage('pkg_1001'))).toEqual({
      id: 'pkg_1001',
      trackingNum: 'tracking_pkg_1001',
      status: 'READY_FOR_PICKUP',
      description: 'Package pkg_1001',
      createdAt: 1_784_419_200,
    })
  })

  it('preserves the serialized package category in the portal detail view', () => {
    expect(toPortalPackageDetail(createPackage('pkg_1001'))).toMatchObject({
      category: {
        id: 'pcat_fragile',
        name: 'Fragile',
        slug: 'fragile',
      },
    })
  })

  it('follows cursors so a portal list is not truncated at the endpoint limit', async () => {
    const first = createPackage('pkg_1002')
    const second = createPackage('pkg_1001')
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          object: 'list',
          data: [first],
          has_more: true,
          total_count: 2,
          url: '/v1/portal/tenants/ten_rocketship/packages',
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          object: 'list',
          data: [second],
          has_more: false,
          total_count: 2,
          url: '/v1/portal/tenants/ten_rocketship/packages',
        },
        error: null,
      })

    await expect(
      listAllPortalPackages(clientWithPackageList(list), 'ten_rocketship')
    ).resolves.toEqual({ data: [first, second], error: null })
    expect(list).toHaveBeenNthCalledWith(1, 'ten_rocketship', { limit: 100 })
    expect(list).toHaveBeenNthCalledWith(2, 'ten_rocketship', {
      limit: 100,
      starting_after: 'pkg_1002',
    })
  })

  it('returns the API error rather than treating a failed page as an empty list', async () => {
    const list = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: 'couriers/unavailable',
        message: 'Couriers is unavailable.',
      },
    })

    await expect(
      listAllPortalPackages(clientWithPackageList(list), 'ten_rocketship')
    ).resolves.toEqual({
      data: null,
      error: {
        code: 'couriers/unavailable',
        message: 'Couriers is unavailable.',
      },
    })
  })
})
