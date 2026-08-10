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
  tenant_id: tenantId,
  user_id: 'usr_kingston',
  billing_customer_id: 'cus_kingston',
  branch_id: null,
  status: 'ACTIVE' as const,
  is_commercial: false,
  first_seen_at: 1,
  created_at: 1,
  updated_at: 1,
  deleted_at: null,
}

const mailbox = {
  object: 'mailbox' as const,
  id: 'mbx_kingston',
  tenant_id: tenantId,
  customer_id: customer.id,
  number: 'KIN-1001',
  is_primary: true,
  created_at: 1,
  updated_at: 1,
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
          org_id: 'org_kingston',
          slug: 'kingston',
          name: 'Kingston Couriers',
          mailbox_prefix: 'KIN',
          status: 'ACTIVE',
          created_at: 1,
          updated_at: 1,
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
        billing_customer_id: customer.billing_customer_id,
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
          billing_customer_id: customer.billing_customer_id,
        }),
      }
    )
  })
})
