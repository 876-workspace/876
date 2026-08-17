import { describe, expect, it, vi } from 'vitest'

import { create876Client } from './client'

const item = {
  object: 'item' as const,
  id: 'item/consulting',
  sourceAppId: null,
  sourceExternalReference: null,
  type: 'SERVICE' as const,
  name: 'Consulting',
  sku: null,
  unit: 'hour',
  description: null,
  imageUrl: null,
  defaultSellingAmount: '12500',
  defaultSellingCurrency: 'JMD',
  defaultCostAmount: null,
  defaultCostCurrency: null,
  isTaxable: true,
  taxCode: 'GCT',
  isActive: true,
  metadata: null,
  createdAt: 1_788_825_600,
  updatedAt: 1_788_825_600,
}

function response(data: unknown) {
  return Response.json({ data, error: null })
}

describe('items resource', () => {
  it('uses the canonical tenant item CRUD paths and response contracts', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({
          object: 'list',
          data: [item],
          has_more: false,
          total_count: 1,
          url: '/api/v1/items',
        })
      )
      .mockResolvedValueOnce(response(item))
      .mockResolvedValueOnce(response({ object: 'item', id: item.id }))
      .mockResolvedValueOnce(response({ object: 'item', id: item.id }))
      .mockResolvedValueOnce(
        response({ object: 'item', id: item.id, deleted: true })
      )

    const client = create876Client({
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })

    const listed = await client.items.list({ active: true })
    const retrieved = await client.items.retrieve(item.id)
    const created = await client.items.create({
      type: 'SERVICE',
      name: 'Consulting',
      unit: 'hour',
      defaultSellingAmount: '12500',
      defaultSellingCurrency: 'JMD',
      isTaxable: true,
      taxCode: 'GCT',
    })
    const updated = await client.items.update(item.id, { name: 'Advisory' })
    const deleted = await client.items.delete(item.id)

    expect(listed.data?.data).toEqual([item])
    expect(retrieved.data).toEqual(item)
    expect(created.data).toEqual({ object: 'item', id: item.id })
    expect(updated.data).toEqual({ object: 'item', id: item.id })
    expect(deleted.data).toEqual({ object: 'item', id: item.id, deleted: true })

    const calls = fetchMock.mock.calls.map(([url, init]) => ({
      url: String(url),
      method: init?.method,
    }))

    expect(calls[0]?.url).toContain('/api/v1/items')
    expect(calls[0]?.url).toContain('active=true')
    expect(calls[0]?.method).toBe('GET')
    expect(calls[1]).toMatchObject({
      url: 'https://billing.example.test/api/v1/items/item%2Fconsulting',
      method: 'GET',
    })
    expect(calls[2]).toMatchObject({
      url: 'https://billing.example.test/api/v1/items',
      method: 'POST',
    })
    expect(calls[3]).toMatchObject({
      url: 'https://billing.example.test/api/v1/items/item%2Fconsulting',
      method: 'PATCH',
    })
    expect(calls[4]).toMatchObject({
      url: 'https://billing.example.test/api/v1/items/item%2Fconsulting',
      method: 'DELETE',
    })
  })
})
