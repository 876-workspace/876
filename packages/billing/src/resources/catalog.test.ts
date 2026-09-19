import { describe, expect, it, vi } from 'vitest'

import { create876Client } from '../client'

function clientFor(payload: unknown) {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json(payload))
  return {
    client: create876Client({ baseUrl: 'https://billing.example.test', fetch }),
    fetch,
  }
}

function catalogList(object: string, id: string) {
  return {
    object: 'list' as const,
    data: [{ object, id, slug: 'slug-1', name: 'Name 1', isActive: true }],
    has_more: false,
    total_count: 1,
    url: `/api/v1/${object === 'price_list' ? 'price-lists' : `${object}s`}`,
  }
}

describe('catalog list filters', () => {
  describe('products', () => {
    it('sends the active filter as a query string', async () => {
      const { client, fetch } = clientFor({
        data: catalogList('product', 'prod_1'),
        error: null,
      })

      await client.products.list({ active: true })

      expect(fetch).toHaveBeenCalledWith(
        'https://billing.example.test/api/v1/products?active=true',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('returns the parsed product list', async () => {
      const payload = catalogList('product', 'prod_1')
      const { client } = clientFor({ data: payload, error: null })

      const result = await client.products.list({})

      expect(result).toEqual({ data: payload, error: null })
    })

    it('surfaces a products failure as a value instead of throwing', async () => {
      const { client } = clientFor({
        data: null,
        error: { code: 'product/forbidden', message: 'Not allowed.' },
      })

      const result = await client.products.list({ active: false })

      expect(result).toEqual({
        data: null,
        error: { code: 'product/forbidden', message: 'Not allowed.' },
      })
    })
  })

  describe('plans', () => {
    it('sends the active and productId filters as a query string', async () => {
      const { client, fetch } = clientFor({
        data: catalogList('plan', 'plan_1'),
        error: null,
      })

      await client.plans.list({ active: true, productId: 'prod_1' })

      expect(fetch).toHaveBeenCalledWith(
        'https://billing.example.test/api/v1/plans?active=true&productId=prod_1',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('returns the parsed plan list', async () => {
      const payload = catalogList('plan', 'plan_1')
      const { client } = clientFor({ data: payload, error: null })

      const result = await client.plans.list({})

      expect(result).toEqual({ data: payload, error: null })
    })

    it('surfaces a plans failure as a value instead of throwing', async () => {
      const { client } = clientFor({
        data: null,
        error: { code: 'plan/forbidden', message: 'Not allowed.' },
      })

      const result = await client.plans.list({ productId: 'prod_1' })

      expect(result).toEqual({
        data: null,
        error: { code: 'plan/forbidden', message: 'Not allowed.' },
      })
    })
  })

  describe('prices', () => {
    it('sends the active and owner filters as a query string', async () => {
      const { client, fetch } = clientFor({
        data: catalogList('price', 'price_1'),
        error: null,
      })

      await client.prices.list({ active: false, planId: 'plan_1' })

      expect(fetch).toHaveBeenCalledWith(
        'https://billing.example.test/api/v1/prices?active=false&planId=plan_1',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('returns the parsed price list', async () => {
      const payload = catalogList('price', 'price_1')
      const { client } = clientFor({ data: payload, error: null })

      const result = await client.prices.list({ itemId: 'item_1' })

      expect(result).toEqual({ data: payload, error: null })
    })

    it('surfaces a prices failure as a value instead of throwing', async () => {
      const { client } = clientFor({
        data: null,
        error: { code: 'price/forbidden', message: 'Not allowed.' },
      })

      const result = await client.prices.list({ addonId: 'addon_1' })

      expect(result).toEqual({
        data: null,
        error: { code: 'price/forbidden', message: 'Not allowed.' },
      })
    })
  })

  describe('addons', () => {
    it('sends the active and productId filters as a query string', async () => {
      const { client, fetch } = clientFor({
        data: catalogList('addon', 'addon_1'),
        error: null,
      })

      await client.addons.list({ active: true, productId: 'prod_1' })

      expect(fetch).toHaveBeenCalledWith(
        'https://billing.example.test/api/v1/addons?active=true&productId=prod_1',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('returns the parsed addon list', async () => {
      const payload = catalogList('addon', 'addon_1')
      const { client } = clientFor({ data: payload, error: null })

      const result = await client.addons.list({})

      expect(result).toEqual({ data: payload, error: null })
    })

    it('surfaces an addons failure as a value instead of throwing', async () => {
      const { client } = clientFor({
        data: null,
        error: { code: 'addon/forbidden', message: 'Not allowed.' },
      })

      const result = await client.addons.list({ active: false })

      expect(result).toEqual({
        data: null,
        error: { code: 'addon/forbidden', message: 'Not allowed.' },
      })
    })
  })

  describe('priceLists', () => {
    it('sends the active filter as a query string', async () => {
      const { client, fetch } = clientFor({
        data: catalogList('price_list', 'pricelist_1'),
        error: null,
      })

      await client.priceLists.list({ active: true })

      expect(fetch).toHaveBeenCalledWith(
        'https://billing.example.test/api/v1/price-lists?active=true',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('returns the parsed price list collection', async () => {
      const payload = catalogList('price_list', 'pricelist_1')
      const { client } = clientFor({ data: payload, error: null })

      const result = await client.priceLists.list({})

      expect(result).toEqual({ data: payload, error: null })
    })

    it('surfaces a price-lists failure as a value instead of throwing', async () => {
      const { client } = clientFor({
        data: null,
        error: { code: 'price-list/forbidden', message: 'Not allowed.' },
      })

      const result = await client.priceLists.list({ active: false })

      expect(result).toEqual({
        data: null,
        error: { code: 'price-list/forbidden', message: 'Not allowed.' },
      })
    })
  })
})
