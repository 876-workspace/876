/**
 * The financial directory, driven through the real middleware chain.
 *
 * The most important tests in this file are the tombstone-gate ones: a caller
 * holding only an app API key must never see a soft-deleted row even when it
 * asks for one. That gate is the reason `include_deleted` is resolved in the
 * service and not trusted from the query string.
 */

import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  bank,
  bankBranch,
  bankAccount,
  creditUnion,
  creditUnionBranch,
  apiKey,
} = vi.hoisted(() => ({
  bank: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  bankBranch: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  bankAccount: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  creditUnion: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  creditUnionBranch: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: {
    bank,
    bankBranch,
    bankAccount,
    creditUnion,
    creditUnionBranch,
    apiKey,
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
/** App-key tier only — no internal key, so tombstones stay hidden. */
const KEY_ONLY = { 'X-876-API-Key': APP_KEY }
/** The privileged tier. */
const ADMIN = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}
const NOW = 1785000000

function bankRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bank_7fJ3',
    name: 'National Commercial Bank',
    shortName: 'NCB',
    bankCode: '001',
    swiftCode: 'JNCBJMKX',
    logoUrl: null,
    headOffice: '1-7 Knutsford Boulevard, Kingston 5',
    website: 'https://www.jncb.com',
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
}

const SERIALIZED_BANK = {
  object: 'bank',
  id: 'bank_7fJ3',
  name: 'National Commercial Bank',
  short_name: 'NCB',
  bank_code: '001',
  swift_code: 'JNCBJMKX',
  logo_url: null,
  head_office: '1-7 Knutsford Boulevard, Kingston 5',
  website: 'https://www.jncb.com',
  created_at: NOW,
  updated_at: NOW,
}

function addressRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'diraddr_11',
    line1: '17 Duke Street',
    line2: null,
    city: 'Kingston',
    state: 'Kingston',
    postalCode: null,
    country: 'JM',
    latitude: 17.9714,
    longitude: -76.7931,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
}

const SERIALIZED_ADDRESS = {
  object: 'directory_address',
  id: 'diraddr_11',
  line1: '17 Duke Street',
  line2: null,
  city: 'Kingston',
  state: 'Kingston',
  postal_code: null,
  country: 'JM',
  latitude: 17.9714,
  longitude: -76.7931,
  created_at: NOW,
  updated_at: NOW,
}

function branchRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bkbr_5t',
    bankId: 'bank_7fJ3',
    name: 'Duke Street Branch',
    transitNumber: '00412',
    routingNumber: null,
    addressId: 'diraddr_11',
    contactNumber: '+18769351000',
    operatingHours: 'Mon-Fri 09:00-15:00',
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    directoryAddress: addressRow(),
    ...overrides,
  }
}

const SERIALIZED_BRANCH = {
  object: 'bank_branch',
  id: 'bkbr_5t',
  bank_id: 'bank_7fJ3',
  name: 'Duke Street Branch',
  transit_number: '00412',
  routing_number: null,
  address_id: 'diraddr_11',
  contact_number: '+18769351000',
  operating_hours: 'Mon-Fri 09:00-15:00',
  address: SERIALIZED_ADDRESS,
  created_at: NOW,
  updated_at: NOW,
}

function accountRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bacct_9k',
    accountHolder: '876 Technologies Limited',
    bankId: 'bank_7fJ3',
    branchId: 'bkbr_5t',
    accountNumber: '354120987',
    accountType: 'savings',
    currency: 'JMD',
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
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

  bank.findMany.mockResolvedValue([bankRow()])
  bank.findFirst.mockResolvedValue(bankRow())
  bank.findUnique.mockResolvedValue({ id: 'bank_7fJ3' })
  bank.create.mockResolvedValue(bankRow())
  bank.update.mockResolvedValue(bankRow())
  bank.updateMany.mockResolvedValue({ count: 1 })
  bank.deleteMany.mockResolvedValue({ count: 1 })

  bankBranch.findMany.mockResolvedValue([branchRow()])
  bankBranch.findFirst.mockResolvedValue(null)
  bankBranch.findUnique.mockResolvedValue({ id: 'bkbr_5t' })
  bankBranch.create.mockResolvedValue(branchRow())
  bankBranch.update.mockResolvedValue(branchRow())
  bankBranch.updateMany.mockResolvedValue({ count: 1 })
  bankBranch.deleteMany.mockResolvedValue({ count: 1 })

  bankAccount.findMany.mockResolvedValue([accountRow()])
  bankAccount.findFirst.mockResolvedValue(accountRow())
  bankAccount.findUnique.mockResolvedValue({ id: 'bacct_9k' })
  bankAccount.create.mockResolvedValue(accountRow())
  bankAccount.update.mockResolvedValue(accountRow())
  bankAccount.updateMany.mockResolvedValue({ count: 1 })
  bankAccount.deleteMany.mockResolvedValue({ count: 1 })

  creditUnion.findMany.mockResolvedValue([])
  creditUnion.findFirst.mockResolvedValue({
    id: 'cu_1',
    name: 'COK Sodality',
    shortName: 'COK',
    logoUrl: null,
    headquarters: null,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
  })
  creditUnion.findUnique.mockResolvedValue({ id: 'cu_1' })
  creditUnion.updateMany.mockResolvedValue({ count: 1 })
  creditUnion.deleteMany.mockResolvedValue({ count: 1 })

  creditUnionBranch.findMany.mockResolvedValue([])
  creditUnionBranch.findFirst.mockResolvedValue(null)
  creditUnionBranch.updateMany.mockResolvedValue({ count: 1 })
  creditUnionBranch.deleteMany.mockResolvedValue({ count: 1 })
})

describe('GET /directory/banks', () => {
  it('returns the bank list', async () => {
    const response = await request(createApp())
      .get('/directory/banks')
      .set(KEY_ONLY)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [SERIALIZED_BANK],
        has_more: false,
        url: '/directory/banks',
        total_count: null,
      },
      error: null,
    })
  })

  it('filters out tombstoned rows for an app-key caller', async () => {
    await request(createApp()).get('/directory/banks').set(KEY_ONLY)

    expect(bank.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null } })
    )
  })

  it('still filters tombstones when an app-key caller asks to include them', async () => {
    // The gate that this whole module exists to preserve: asking is not enough,
    // the caller has to be internal.
    await request(createApp())
      .get('/directory/banks?include_deleted=true')
      .set(KEY_ONLY)

    expect(bank.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null } })
    )
  })

  it('treats include_deleted=false as false, even for an internal caller', async () => {
    // Regression: `z.coerce.boolean()` is `Boolean(value)`, so the non-empty
    // string 'false' coerced to true and this route returned tombstoned rows to
    // a caller that explicitly asked not to see them.
    await request(createApp())
      .get('/directory/banks?include_deleted=false')
      .set(ADMIN)

    expect(bank.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null } })
    )
  })

  it('includes tombstoned rows for an internal caller that asks', async () => {
    await request(createApp())
      .get('/directory/banks?include_deleted=true')
      .set(ADMIN)

    expect(bank.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    )
  })

  it('applies a case-insensitive name search', async () => {
    await request(createApp())
      .get('/directory/banks?search=national')
      .set(KEY_ONLY)

    expect(bank.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          name: { contains: 'national', mode: 'insensitive' },
        },
      })
    )
  })

  it('rejects a caller with no API key', async () => {
    const response = await request(createApp()).get('/directory/banks')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('api-key/missing')
    expect(bank.findMany).not.toHaveBeenCalled()
  })
})

describe('GET /directory/banks/:bank_id', () => {
  it('returns one bank', async () => {
    const response = await request(createApp())
      .get('/directory/banks/bank_7fJ3')
      .set(KEY_ONLY)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: SERIALIZED_BANK, error: null })
  })

  it('answers 404 with the exact code when the bank is absent', async () => {
    bank.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/directory/banks/bank_missing')
      .set(KEY_ONLY)

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'bank/not-found',
        message: 'No bank exists with the provided identifier.',
      },
    })
  })
})

describe('POST /directory/banks', () => {
  it('creates a bank', async () => {
    bank.findFirst.mockResolvedValueOnce(null)

    const response = await request(createApp())
      .post('/directory/banks')
      .set(ADMIN)
      .send({ name: 'National Commercial Bank', bank_code: '001' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: SERIALIZED_BANK, error: null })
  })

  it('rejects a duplicate bank code with 409', async () => {
    bank.findFirst.mockResolvedValue(bankRow())

    const response = await request(createApp())
      .post('/directory/banks')
      .set(ADMIN)
      .send({ name: 'Another', bank_code: '001' })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'bank/duplicate-code',
        message: 'A bank with this code already exists.',
      },
    })
    expect(bank.create).not.toHaveBeenCalled()
  })

  it('treats a soft-deleted row as still holding its code', async () => {
    // The unique index covers tombstoned rows, so the lookup must include them
    // or a clear 409 becomes a constraint violation surfacing as a 500.
    bank.findFirst.mockResolvedValue(bankRow({ deletedAt: BigInt(NOW) }))

    const response = await request(createApp())
      .post('/directory/banks')
      .set(ADMIN)
      .send({ name: 'Another', bank_code: '001' })

    expect(response.status).toBe(409)
    expect(bank.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { bankCode: '001' } })
    )
  })

  it('rejects a missing required field', async () => {
    const response = await request(createApp())
      .post('/directory/banks')
      .set(ADMIN)
      .send({ short_name: 'NCB' })

    expect(response.status).toBe(422)
    expect(bank.create).not.toHaveBeenCalled()
  })

  it('rejects an unknown field, because the body is strict', async () => {
    const response = await request(createApp())
      .post('/directory/banks')
      .set(ADMIN)
      .send({ name: 'X', bank_code: '9', nickname: 'oops' })

    expect(response.status).toBe(422)
    expect(bank.create).not.toHaveBeenCalled()
  })

  it('refuses an app-key caller without the internal key', async () => {
    const response = await request(createApp())
      .post('/directory/banks')
      .set(KEY_ONLY)
      .send({ name: 'National Commercial Bank', bank_code: '001' })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/no-session')
    expect(bank.create).not.toHaveBeenCalled()
  })
})

describe('PATCH /directory/banks/:bank_id', () => {
  it('applies only the fields that were sent', async () => {
    bank.findFirst.mockResolvedValue(null)

    await request(createApp())
      .patch('/directory/banks/bank_7fJ3')
      .set(ADMIN)
      .send({ short_name: 'NCB Jamaica' })

    expect(bank.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bank_7fJ3' },
        data: expect.objectContaining({ shortName: 'NCB Jamaica' }),
      })
    )
  })

  it('rejects an empty update', async () => {
    const response = await request(createApp())
      .patch('/directory/banks/bank_7fJ3')
      .set(ADMIN)
      .send({})

    expect(response.status).toBe(400)
    expect(response.body.error.message).toBe('No fields to update.')
    expect(bank.update).not.toHaveBeenCalled()
  })

  it('allows a bank to keep its own code', async () => {
    bank.findFirst.mockResolvedValue(bankRow())

    const response = await request(createApp())
      .patch('/directory/banks/bank_7fJ3')
      .set(ADMIN)
      .send({ bank_code: '001' })

    expect(response.status).toBe(200)
  })

  it('rejects taking another bank’s code', async () => {
    bank.findFirst.mockResolvedValue(bankRow({ id: 'bank_other' }))

    const response = await request(createApp())
      .patch('/directory/banks/bank_7fJ3')
      .set(ADMIN)
      .send({ bank_code: '001' })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('bank/duplicate-code')
    expect(bank.update).not.toHaveBeenCalled()
  })

  it('answers 404 when the bank is gone', async () => {
    bank.findFirst.mockResolvedValue(null)
    bank.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .patch('/directory/banks/bank_missing')
      .set(ADMIN)
      .send({ name: 'X' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('bank/not-found')
  })
})

describe('DELETE /directory/banks/:bank_id', () => {
  it('returns a tombstone', async () => {
    const response = await request(createApp())
      .delete('/directory/banks/bank_7fJ3')
      .set(ADMIN)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { object: 'bank', id: 'bank_7fJ3', deleted: true },
      error: null,
    })
  })

  it('hard deletes under the default mode', async () => {
    await request(createApp()).delete('/directory/banks/bank_7fJ3').set(ADMIN)

    expect(bank.deleteMany).toHaveBeenCalledWith({
      where: { id: 'bank_7fJ3' },
    })
    expect(bank.updateMany).not.toHaveBeenCalled()
  })

  it('answers 404 when nothing was deleted', async () => {
    bank.deleteMany.mockResolvedValue({ count: 0 })

    const response = await request(createApp())
      .delete('/directory/banks/bank_missing')
      .set(ADMIN)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('bank/not-found')
  })
})

describe('GET /directory/banks/:bank_id/branches', () => {
  it('returns the branch list with its nested address', async () => {
    const response = await request(createApp())
      .get('/directory/banks/bank_7fJ3/branches')
      .set(KEY_ONLY)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [SERIALIZED_BRANCH],
        has_more: false,
        url: '/directory/banks/bank_7fJ3/branches',
        total_count: null,
      },
      error: null,
    })
  })

  it('scopes the query to the parent bank', async () => {
    await request(createApp())
      .get('/directory/banks/bank_7fJ3/branches')
      .set(KEY_ONLY)

    expect(bankBranch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bankId: 'bank_7fJ3', deletedAt: null },
      })
    )
  })

  it('answers 404 when the parent bank is absent', async () => {
    bank.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/directory/banks/bank_missing/branches')
      .set(KEY_ONLY)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('bank/not-found')
    expect(bankBranch.findMany).not.toHaveBeenCalled()
  })
})

describe('POST /directory/banks/:bank_id/branches', () => {
  it('creates the branch and its address in one write', async () => {
    const response = await request(createApp())
      .post('/directory/banks/bank_7fJ3/branches')
      .set(ADMIN)
      .send({
        name: 'Duke Street Branch',
        transit_number: '00412',
        address: {
          line1: '17 Duke Street',
          city: 'Kingston',
          state: 'Kingston',
          latitude: 17.9714,
          longitude: -76.7931,
        },
      })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: SERIALIZED_BRANCH, error: null })
    expect(bankBranch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bank: { connect: { id: 'bank_7fJ3' } },
          directoryAddress: {
            create: expect.objectContaining({ line1: '17 Duke Street' }),
          },
        }),
      })
    )
  })

  it('defaults the address country to JM', async () => {
    await request(createApp())
      .post('/directory/banks/bank_7fJ3/branches')
      .set(ADMIN)
      .send({
        name: 'Duke Street Branch',
        transit_number: '00412',
        address: {
          line1: '17 Duke Street',
          city: 'Kingston',
          state: 'Kingston',
          latitude: 17.9714,
          longitude: -76.7931,
        },
      })

    expect(bankBranch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          directoryAddress: {
            create: expect.objectContaining({ country: 'JM' }),
          },
        }),
      })
    )
  })

  it('rejects a duplicate transit number for the same bank', async () => {
    bankBranch.findFirst.mockResolvedValue(branchRow())

    const response = await request(createApp())
      .post('/directory/banks/bank_7fJ3/branches')
      .set(ADMIN)
      .send({
        name: 'Another',
        transit_number: '00412',
        address: {
          line1: '1 Road',
          city: 'Kingston',
          state: 'Kingston',
          latitude: 18,
          longitude: -76,
        },
      })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'bank_branch/duplicate-transit-number',
        message:
          'A branch with this transit number already exists for this bank.',
      },
    })
    expect(bankBranch.create).not.toHaveBeenCalled()
  })

  it('rejects an out-of-range latitude', async () => {
    const response = await request(createApp())
      .post('/directory/banks/bank_7fJ3/branches')
      .set(ADMIN)
      .send({
        name: 'X',
        transit_number: '1',
        address: {
          line1: '1 Road',
          city: 'Kingston',
          state: 'Kingston',
          latitude: 91,
          longitude: -76,
        },
      })

    expect(response.status).toBe(422)
    expect(bankBranch.create).not.toHaveBeenCalled()
  })
})

describe('PATCH /directory/bank-branches/:branch_id', () => {
  it('updates the nested address when one is sent', async () => {
    await request(createApp())
      .patch('/directory/bank-branches/bkbr_5t')
      .set(ADMIN)
      .send({ address: { city: 'Montego Bay' } })

    expect(bankBranch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          directoryAddress: {
            update: expect.objectContaining({ city: 'Montego Bay' }),
          },
        }),
      })
    )
  })

  it('accepts an address-only update', async () => {
    const response = await request(createApp())
      .patch('/directory/bank-branches/bkbr_5t')
      .set(ADMIN)
      .send({ address: { city: 'Montego Bay' } })

    expect(response.status).toBe(200)
  })

  it('leaves the address alone when none is sent', async () => {
    await request(createApp())
      .patch('/directory/bank-branches/bkbr_5t')
      .set(ADMIN)
      .send({ name: 'Renamed' })

    const call = bankBranch.update.mock.calls[0]?.[0] as {
      data: Record<string, unknown>
    }
    expect(call.data).not.toHaveProperty('directoryAddress')
  })

  it('rejects an empty update', async () => {
    const response = await request(createApp())
      .patch('/directory/bank-branches/bkbr_5t')
      .set(ADMIN)
      .send({})

    expect(response.status).toBe(400)
    expect(bankBranch.update).not.toHaveBeenCalled()
  })
})

describe('DELETE /directory/bank-branches/:branch_id', () => {
  it('returns a bank_branch tombstone', async () => {
    const response = await request(createApp())
      .delete('/directory/bank-branches/bkbr_5t')
      .set(ADMIN)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { object: 'bank_branch', id: 'bkbr_5t', deleted: true },
      error: null,
    })
  })

  it('answers 404 with the branch code when nothing was deleted', async () => {
    bankBranch.deleteMany.mockResolvedValue({ count: 0 })

    const response = await request(createApp())
      .delete('/directory/bank-branches/bkbr_missing')
      .set(ADMIN)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('bank_branch/not-found')
  })
})

describe('bank accounts', () => {
  it('lists accounts', async () => {
    const response = await request(createApp())
      .get('/directory/bank-accounts')
      .set(KEY_ONLY)

    expect(response.status).toBe(200)
    expect(response.body.data.data).toEqual([
      {
        object: 'bank_account',
        id: 'bacct_9k',
        account_holder: '876 Technologies Limited',
        bank_id: 'bank_7fJ3',
        branch_id: 'bkbr_5t',
        account_number: '354120987',
        account_type: 'savings',
        currency: 'JMD',
        created_at: NOW,
        updated_at: NOW,
      },
    ])
    expect(response.body.data.url).toBe('/directory/bank-accounts')
  })

  it('applies the documented account_type and currency defaults', async () => {
    await request(createApp())
      .post('/directory/bank-accounts')
      .set(ADMIN)
      .send({
        account_holder: '876 Technologies Limited',
        bank_id: 'bank_7fJ3',
        account_number: '354120987',
      })

    expect(bankAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accountType: 'savings',
          currency: 'JMD',
        }),
      })
    )
  })

  it('rejects a currency that is not three characters', async () => {
    const response = await request(createApp())
      .post('/directory/bank-accounts')
      .set(ADMIN)
      .send({
        account_holder: 'X',
        bank_id: 'bank_7fJ3',
        account_number: '1',
        currency: 'JMDD',
      })

    expect(response.status).toBe(422)
    expect(bankAccount.create).not.toHaveBeenCalled()
  })

  it('answers 404 when the bank is absent', async () => {
    bank.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/directory/bank-accounts')
      .set(ADMIN)
      .send({
        account_holder: 'X',
        bank_id: 'bank_missing',
        account_number: '1',
      })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('bank/not-found')
    expect(bankAccount.create).not.toHaveBeenCalled()
  })

  it('answers 404 when the named branch is absent', async () => {
    bankBranch.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/directory/bank-accounts')
      .set(ADMIN)
      .send({
        account_holder: 'X',
        bank_id: 'bank_7fJ3',
        account_number: '1',
        branch_id: 'bkbr_missing',
      })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('bank_branch/not-found')
    expect(bankAccount.create).not.toHaveBeenCalled()
  })
})

describe('credit unions', () => {
  it('returns an empty page rather than an error for an unknown cursor', async () => {
    creditUnion.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/directory/credit-unions?starting_after=cu_gone')
      .set(KEY_ONLY)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      object: 'list',
      data: [],
      has_more: false,
      url: '/directory/credit-unions',
      total_count: null,
    })
    expect(creditUnion.findMany).not.toHaveBeenCalled()
  })

  it('answers 404 with the credit_union code', async () => {
    creditUnion.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/directory/credit-unions/cu_missing')
      .set(KEY_ONLY)

    expect(response.status).toBe(404)
    expect(response.body.error).toEqual({
      code: 'credit_union/not-found',
      message: 'No credit union exists with the provided identifier.',
    })
  })

  it('scopes a branch list to its parent credit union', async () => {
    await request(createApp())
      .get('/directory/credit-unions/cu_1/branches')
      .set(KEY_ONLY)

    expect(creditUnionBranch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { creditUnionId: 'cu_1', deletedAt: null },
      })
    )
  })

  it('refuses an app-key caller on a branch mutation', async () => {
    const response = await request(createApp())
      .delete('/directory/credit-union-branches/cubr_1')
      .set(KEY_ONLY)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/no-session')
    expect(creditUnionBranch.deleteMany).not.toHaveBeenCalled()
  })
})

describe('route shape', () => {
  it('answers 404, not 401, for an unknown path under the prefix', async () => {
    // Guards attach per route, so an unknown path must not be answered by a
    // router-level guard.
    const response = await request(createApp())
      .get('/directory/nonexistent')
      .set(KEY_ONLY)

    expect(response.status).toBe(404)
  })
})
