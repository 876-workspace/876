import { describe, expect, it, vi } from 'vitest'

import { createMailboxesResource } from './mailboxes'
import { buildAdminRuntime } from '../runtime'

const baseUrl = 'https://couriers.876.local'
const apiKey = '876_app_secret_couriers'
const internalKey = 'couriers_internal_kingston'
const tenantId = 'ten_kingston/876'
const mailboxId = 'mbx_kingston/1842 A'

const mailboxList = {
  object: 'list' as const,
  data: [],
  hasMore: false,
  totalCount: 0,
  url: `/v1/tenants/${encodeURIComponent(tenantId)}/mailboxes`,
}

function createResource(fetchMock: typeof fetch) {
  return createMailboxesResource(
    buildAdminRuntime({ baseUrl, apiKey, internalKey, fetch: fetchMock })
  )
}

function successFetch(data: unknown) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ data, error: null }))
}

describe('createMailboxesResource', () => {
  it('sends filters and a starting_after cursor when listing mailboxes', async () => {
    const fetchMock = successFetch(mailboxList)
    const resource = createResource(fetchMock)

    const result = await resource.list(tenantId, {
      customerId: 'cpr_kingston/brown market',
      limit: 50,
      startingAfter: mailboxId,
    })

    expect(result).toEqual({ data: mailboxList, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/mailboxes?customer_id=cpr_kingston%2Fbrown+market&limit=50&starting_after=mbx_kingston%2F1842+A`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
      }
    )
  })

  it('sends an ending_before cursor when listing mailboxes', async () => {
    const fetchMock = successFetch(mailboxList)
    const resource = createResource(fetchMock)

    await resource.list(tenantId, { endingBefore: mailboxId })

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/mailboxes?ending_before=mbx_kingston%2F1842+A`,
      expect.anything()
    )
  })

  it('exposes no public allocate verb', async () => {
    const fetchMock = successFetch(mailboxList)
    const resource = createResource(fetchMock)
    expect('allocate' in resource).toBe(false)
  })
})
