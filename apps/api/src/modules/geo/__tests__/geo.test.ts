import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The Prisma client is mocked at the module boundary, so these tests drive the
 * real router, validation, service, serializer, and envelope — everything except
 * the database round trip.
 */
const { currency, country, region } = vi.hoisted(() => ({
  currency: { findMany: vi.fn() },
  country: { findMany: vi.fn(), findUnique: vi.fn() },
  region: { findMany: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: { currency, country, region },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')

const JMD = {
  code: 'JMD',
  name: 'Jamaican Dollar',
  symbol: 'J$',
  decimalPlaces: 2,
}
const JAMAICA = {
  code: 'JM',
  name: 'Jamaica',
  phonePrefix: '+1-876',
  defaultCurrencyCode: 'JMD',
}
const KINGSTON = {
  id: 'reg_kingston',
  countryCode: 'JM',
  code: 'JM-01',
  name: 'Kingston',
  type: 'parish',
}

beforeEach(() => {
  vi.clearAllMocks()
  currency.findMany.mockResolvedValue([JMD])
  country.findMany.mockResolvedValue([JAMAICA])
  country.findUnique.mockResolvedValue({ code: 'JM' })
  region.findMany.mockResolvedValue([KINGSTON])
})

describe('GET /geo/currencies', () => {
  it('returns enabled currencies as currency resources', async () => {
    const response = await request(createApp()).get('/geo/currencies')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: [
        {
          object: 'currency',
          code: 'JMD',
          name: 'Jamaican Dollar',
          symbol: 'J$',
          decimal_places: 2,
        },
      ],
      error: null,
    })
  })

  it('asks the database for enabled rows only, ordered by code', async () => {
    await request(createApp()).get('/geo/currencies')

    expect(currency.findMany).toHaveBeenCalledTimes(1)
    expect(currency.findMany).toHaveBeenCalledWith({
      where: { isEnabled: true },
      orderBy: { code: 'asc' },
      select: { code: true, name: true, symbol: true, decimalPlaces: true },
    })
  })

  it('needs no credentials — a sign-up form reads it before login', async () => {
    const response = await request(createApp()).get('/geo/currencies')

    expect(response.status).toBe(200)
  })

  it('returns an empty list rather than an error when nothing is seeded', async () => {
    currency.findMany.mockResolvedValue([])

    const response = await request(createApp()).get('/geo/currencies')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: [], error: null })
  })
})

describe('GET /geo/countries', () => {
  it('returns enabled countries as country resources', async () => {
    const response = await request(createApp()).get('/geo/countries')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: [
        {
          object: 'country',
          code: 'JM',
          name: 'Jamaica',
          phone_prefix: '+1-876',
          default_currency_code: 'JMD',
        },
      ],
      error: null,
    })
  })

  it('serializes absent optional columns as null, never as a missing key', async () => {
    country.findMany.mockResolvedValue([
      { ...JAMAICA, phonePrefix: null, defaultCurrencyCode: null },
    ])

    const response = await request(createApp()).get('/geo/countries')

    expect(response.body.data[0]).toEqual({
      object: 'country',
      code: 'JM',
      name: 'Jamaica',
      phone_prefix: null,
      default_currency_code: null,
    })
  })

  it('orders countries by name, since the list is rendered as a picker', async () => {
    await request(createApp()).get('/geo/countries')

    expect(country.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isEnabled: true },
        orderBy: { name: 'asc' },
      })
    )
  })
})

describe('GET /geo/countries/:country_code/regions', () => {
  it('returns the regions of a known country', async () => {
    const response = await request(createApp()).get('/geo/countries/JM/regions')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: [
        {
          object: 'region',
          id: 'reg_kingston',
          country_code: 'JM',
          code: 'JM-01',
          name: 'Kingston',
          type: 'parish',
        },
      ],
      error: null,
    })
  })

  it('upper-cases the country code before querying', async () => {
    await request(createApp()).get('/geo/countries/jm/regions')

    expect(country.findUnique).toHaveBeenCalledWith({
      where: { code: 'JM' },
      select: { code: true },
    })
    expect(region.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { countryCode: 'JM', isEnabled: true },
      })
    )
  })

  it('404s an unknown country rather than returning an empty list', async () => {
    // The distinction matters: "this country has no regions on file" and "you
    // asked for a country that does not exist" are different answers.
    country.findUnique.mockResolvedValue(null)

    const response = await request(createApp()).get('/geo/countries/ZZ/regions')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'country/not-found', message: 'Country not found.' },
    })
    expect(region.findMany).not.toHaveBeenCalled()
  })

  it('returns an empty list for a known country with no regions', async () => {
    region.findMany.mockResolvedValue([])

    const response = await request(createApp()).get('/geo/countries/JM/regions')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: [], error: null })
  })

  it('does not leak the server-only http status on the 404', async () => {
    country.findUnique.mockResolvedValue(null)

    const response = await request(createApp()).get('/geo/countries/ZZ/regions')

    expect(response.body.error).not.toHaveProperty('httpStatus')
  })
})

describe('the published OpenAPI document', () => {
  it('documents every geo operation', async () => {
    const response = await request(createApp()).get('/openapi.json')

    expect(Object.keys(response.body.paths)).toEqual(
      expect.arrayContaining([
        '/geo/currencies',
        '/geo/countries',
        '/geo/countries/{country_code}/regions',
      ])
    )
  })

  it('documents the geo routes as public', async () => {
    const response = await request(createApp()).get('/openapi.json')

    expect(response.body.paths['/geo/currencies'].get.security).toBeUndefined()
  })
})
