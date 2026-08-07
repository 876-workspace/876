import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { address, apiKey } = vi.hoisted(() => ({
  address: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: { address, apiKey },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const AUTH = { 'X-876-API-Key': APP_KEY, 'x-internal-key': 'test-internal-key' }
const NOW = 1785000000

function addressRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'adr_7fJ3',
    userId: 'user_2kL9',
    organizationId: null,
    type: 'home',
    label: 'Home',
    line1: '12 Hope Road',
    line2: null,
    city: 'Kingston',
    regionId: 'reg_kingston',
    countryCode: 'JM',
    postalCode: null,
    isDefault: true,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
}

const SERIALIZED = {
  object: 'address',
  id: 'adr_7fJ3',
  user_id: 'user_2kL9',
  organization_id: null,
  type: 'home',
  label: 'Home',
  line1: '12 Hope Road',
  line2: null,
  city: 'Kingston',
  region_id: 'reg_kingston',
  country_code: 'JM',
  postal_code: null,
  is_default: true,
  created_at: NOW,
  updated_at: NOW,
}

beforeEach(() => {
  vi.clearAllMocks()
  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_4qR8',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
  address.findMany.mockResolvedValue([addressRow()])
  address.findUnique.mockResolvedValue(addressRow())
  address.create.mockResolvedValue(addressRow())
  address.update.mockResolvedValue(addressRow())
  address.deleteMany.mockResolvedValue({ count: 1 })
})

describe('GET /addresses', () => {
  it('lists a user’s addresses', async () => {
    const response = await request(createApp())
      .get('/addresses?userId=user_2kL9')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [SERIALIZED],
        has_more: false,
        url: '/addresses',
        total_count: null,
      },
      error: null,
    })
    expect(address.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user_2kL9' } })
    )
  })

  it('lists an organization’s addresses', async () => {
    await request(createApp())
      .get('/addresses?organizationId=org_4qR8')
      .set(AUTH)

    expect(address.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org_4qR8' } })
    )
  })

  it('requires an owner', async () => {
    const response = await request(createApp()).get('/addresses').set(AUTH)

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'provider/invalid-request',
        message: 'userId or organizationId is required.',
      },
    })
    expect(address.findMany).not.toHaveBeenCalled()
  })

  it('refuses both owners at once', async () => {
    const response = await request(createApp())
      .get('/addresses?userId=user_1&organizationId=org_1')
      .set(AUTH)

    expect(response.status).toBe(400)
    expect(response.body.error.message).toBe(
      'Provide userId or organizationId, not both.'
    )
    expect(address.findMany).not.toHaveBeenCalled()
  })

  it('is admin-only', async () => {
    const response = await request(createApp())
      .get('/addresses?userId=user_1')
      .set('X-876-API-Key', APP_KEY)

    expect(response.status).toBe(401)
  })
})

describe('POST /addresses', () => {
  it('creates an address for a user', async () => {
    const response = await request(createApp())
      .post('/addresses')
      .set(AUTH)
      .send({ userId: 'user_2kL9', type: 'home', line1: '12 Hope Road' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: SERIALIZED, error: null })
    expect(address.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user_2kL9',
          organizationId: null,
          type: 'home',
          line1: '12 Hope Road',
        }),
      })
    )
  })

  it('accepts the snake_case spelling of an aliased field', async () => {
    // Pydantic set populate_by_name, so both spellings reached production.
    await request(createApp())
      .post('/addresses')
      .set(AUTH)
      .send({ user_id: 'user_2kL9', country_code: 'JM', is_default: true })

    expect(address.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user_2kL9',
          countryCode: 'JM',
          isDefault: true,
        }),
      })
    )
  })

  it('defaults the type to other', async () => {
    await request(createApp())
      .post('/addresses')
      .set(AUTH)
      .send({ userId: 'user_2kL9' })

    expect(address.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'other' }),
      })
    )
  })

  it('refuses an address with no owner', async () => {
    const response = await request(createApp())
      .post('/addresses')
      .set(AUTH)
      .send({ line1: '12 Hope Road' })

    expect(response.status).toBe(400)
    expect(address.create).not.toHaveBeenCalled()
  })

  it('refuses an address owned by both a user and an org', async () => {
    // A row with two owners has no correct reading, so it is refused on the way
    // in rather than resolved later.
    const response = await request(createApp())
      .post('/addresses')
      .set(AUTH)
      .send({ userId: 'user_1', organizationId: 'org_1' })

    expect(response.status).toBe(400)
    expect(response.body.error.message).toBe(
      'Provide userId or organizationId, not both.'
    )
    expect(address.create).not.toHaveBeenCalled()
  })

  it('rejects an unknown address type', async () => {
    const response = await request(createApp())
      .post('/addresses')
      .set(AUTH)
      .send({ userId: 'user_1', type: 'warehouse' })

    expect(response.status).toBe(422)
  })
})

describe('GET /addresses/:address_id', () => {
  it('returns the address', async () => {
    const response = await request(createApp())
      .get('/addresses/adr_7fJ3')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: SERIALIZED, error: null })
  })

  it('404s an unknown address', async () => {
    address.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/addresses/adr_gone')
      .set(AUTH)

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'address/not-found', message: 'Address not found.' },
    })
  })

  it('serializes an out-of-enum stored type as other', async () => {
    // The column is free-text with a default, so a stale row must not break the
    // response for every caller.
    address.findUnique.mockResolvedValue(addressRow({ type: 'warehouse' }))

    const response = await request(createApp())
      .get('/addresses/adr_7fJ3')
      .set(AUTH)

    expect(response.body.data.type).toBe('other')
  })
})

describe('PATCH /addresses/:address_id', () => {
  it('applies only the fields that were sent', async () => {
    await request(createApp())
      .patch('/addresses/adr_7fJ3')
      .set(AUTH)
      .send({ city: 'Montego Bay' })

    const data = address.update.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >
    expect(data.city).toBe('Montego Bay')
    expect(data).not.toHaveProperty('line1')
    expect(data.updatedAt).toEqual(expect.any(BigInt))
  })

  it('rejects an empty update rather than answering 200', async () => {
    // An empty body almost always means a field name this endpoint does not
    // accept; a 200 would hide that.
    const response = await request(createApp())
      .patch('/addresses/adr_7fJ3')
      .set(AUTH)
      .send({})

    expect(response.status).toBe(400)
    expect(response.body.error.message).toBe('No fields to update.')
    expect(address.update).not.toHaveBeenCalled()
  })

  it('ignores an explicit null instead of clearing the column', async () => {
    const response = await request(createApp())
      .patch('/addresses/adr_7fJ3')
      .set(AUTH)
      .send({ label: null })

    expect(response.status).toBe(400)
    expect(address.update).not.toHaveBeenCalled()
  })

  it('404s an unknown address', async () => {
    address.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .patch('/addresses/adr_gone')
      .set(AUTH)
      .send({ city: 'Kingston' })

    expect(response.status).toBe(404)
    expect(address.update).not.toHaveBeenCalled()
  })
})

describe('DELETE /addresses/:address_id', () => {
  it('returns a tombstone', async () => {
    const response = await request(createApp())
      .delete('/addresses/adr_7fJ3')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { object: 'address', id: 'adr_7fJ3', deleted: true },
      error: null,
    })
  })

  it('404s when nothing was deleted', async () => {
    address.deleteMany.mockResolvedValue({ count: 0 })

    const response = await request(createApp())
      .delete('/addresses/adr_gone')
      .set(AUTH)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('address/not-found')
  })
})
