import { describe, expect, it, vi } from 'vitest'

import { createPortalResource } from './portal'
import { buildRuntime } from '../runtime'

const baseUrl = 'https://couriers.876.local'
const apiKey = '876_app_secret_couriers'
const accessToken = 'portal-access-token'
const tenantId = 'ten_kingston/876'

const customer = {
  object: 'courier_customer_profile' as const,
  id: 'cpr_kingston',
  tenantId: tenantId,
  userId: 'usr_kingston',
  billingCustomerId: 'cus_kingston',
  branchId: null,
  status: 'ACTIVE' as const,
  isCommercial: false,
  firstSeenAt: 1,
  createdAt: 1,
  updatedAt: 1,
  deletedAt: null,
}

const mailbox = {
  object: 'mailbox' as const,
  id: 'mbx_kingston',
  tenantId: tenantId,
  customerId: customer.id,
  number: 'KIN-1001',
  isPrimary: true,
  createdAt: 1,
  updatedAt: 1,
}

function createResource(fetchMock: typeof fetch) {
  return createPortalResource(
    buildRuntime({ baseUrl, apiKey, accessToken, fetch: fetchMock })
  )
}

describe('portal resource', () => {
  it('uses only the app key to resolve a public portal tenant', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: {
          object: 'tenant',
          id: tenantId,
          orgId: 'org_kingston',
          slug: 'kingston',
          name: 'Kingston Couriers',
          mailboxPrefix: 'KIN',
          status: 'ACTIVE',
          createdAt: 1,
          updatedAt: 1,
        },
        error: null,
      })
    )

    await expect(
      createResource(fetchMock).tenants.resolve({ hostname: 'portal.876.test' })
    ).resolves.toMatchObject({ data: { id: tenantId }, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/portal/tenants/resolve?hostname=portal.876.test`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
        },
      }
    )
  })

  it('sends the request-bound bearer token for atomic portal enrollment', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: { object: 'courier_customer_enrollment', customer, mailbox },
        error: null,
      })
    )

    await expect(
      createResource(fetchMock).enrollments.create(tenantId, {
        billingCustomerId: customer.billing_customer_id,
      })
    ).resolves.toMatchObject({ data: { customer, mailbox }, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/portal/tenants/ten_kingston%2F876/enrollments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          billingCustomerId: customer.billing_customer_id,
        }),
      }
    )
  })
})
