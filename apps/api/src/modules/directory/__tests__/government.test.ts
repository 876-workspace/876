/** Ministries and their departments, driven through the real middleware chain. */

import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { ministry, ministryDepartment, apiKey } = vi.hoisted(() => ({
  ministry: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  ministryDepartment: {
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
  prisma: { ministry, ministryDepartment, apiKey },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const KEY_ONLY = { 'X-876-API-Key': APP_KEY }
const ADMIN = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}
const NOW = 1785000000

function ministryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'min_3a',
    name: 'Ministry of Finance and the Public Service',
    portfolio: 'Finance',
    minister: 'Fayval Williams',
    website: 'https://mof.gov.jm',
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
}

const SERIALIZED_MINISTRY = {
  object: 'ministry',
  id: 'min_3a',
  name: 'Ministry of Finance and the Public Service',
  portfolio: 'Finance',
  minister: 'Fayval Williams',
  website: 'https://mof.gov.jm',
  created_at: NOW,
  updated_at: NOW,
}

function addressRow() {
  return {
    id: 'diraddr_30',
    line1: '30 National Heroes Circle',
    line2: null,
    city: 'Kingston',
    state: 'Kingston',
    postalCode: null,
    country: 'JM',
    latitude: 17.9889,
    longitude: -76.7834,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
  }
}

function departmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mind_8b',
    ministryId: 'min_3a',
    name: 'Taxpayer Audit and Assessment',
    description: null,
    addressId: 'diraddr_30',
    contactEmail: 'taad@mof.gov.jm',
    contactNumber: '+18769221000',
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    directoryAddress: addressRow(),
    ...overrides,
  }
}

const SERIALIZED_DEPARTMENT = {
  object: 'ministry_department',
  id: 'mind_8b',
  ministry_id: 'min_3a',
  name: 'Taxpayer Audit and Assessment',
  description: null,
  address_id: 'diraddr_30',
  contact_email: 'taad@mof.gov.jm',
  contact_number: '+18769221000',
  address: {
    object: 'directory_address',
    id: 'diraddr_30',
    line1: '30 National Heroes Circle',
    line2: null,
    city: 'Kingston',
    state: 'Kingston',
    postal_code: null,
    country: 'JM',
    latitude: 17.9889,
    longitude: -76.7834,
    created_at: NOW,
    updated_at: NOW,
  },
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

  ministry.findMany.mockResolvedValue([ministryRow()])
  ministry.findFirst.mockResolvedValue(ministryRow())
  ministry.findUnique.mockResolvedValue({ id: 'min_3a' })
  ministry.create.mockResolvedValue(ministryRow())
  ministry.update.mockResolvedValue(ministryRow())
  ministry.updateMany.mockResolvedValue({ count: 1 })
  ministry.deleteMany.mockResolvedValue({ count: 1 })

  ministryDepartment.findMany.mockResolvedValue([departmentRow()])
  ministryDepartment.findFirst.mockResolvedValue(departmentRow())
  ministryDepartment.findUnique.mockResolvedValue({ id: 'mind_8b' })
  ministryDepartment.create.mockResolvedValue(departmentRow())
  ministryDepartment.update.mockResolvedValue(departmentRow())
  ministryDepartment.updateMany.mockResolvedValue({ count: 1 })
  ministryDepartment.deleteMany.mockResolvedValue({ count: 1 })
})

describe('GET /directory/ministries', () => {
  it('returns the ministry list', async () => {
    const response = await request(createApp())
      .get('/directory/ministries')
      .set(KEY_ONLY)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [SERIALIZED_MINISTRY],
        has_more: false,
        url: '/directory/ministries',
        total_count: null,
      },
      error: null,
    })
  })

  it('hides tombstoned rows from an app-key caller that asks for them', async () => {
    await request(createApp())
      .get('/directory/ministries?include_deleted=true')
      .set(KEY_ONLY)

    expect(ministry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null } })
    )
  })

  it('includes tombstoned rows for an internal caller', async () => {
    await request(createApp())
      .get('/directory/ministries?include_deleted=true')
      .set(ADMIN)

    expect(ministry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    )
  })
})

describe('GET /directory/ministries/:ministry_id', () => {
  it('returns one ministry', async () => {
    const response = await request(createApp())
      .get('/directory/ministries/min_3a')
      .set(KEY_ONLY)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: SERIALIZED_MINISTRY, error: null })
  })

  it('answers 404 with the exact code', async () => {
    ministry.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/directory/ministries/min_missing')
      .set(KEY_ONLY)

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'ministry/not-found',
        message: 'No ministry exists with the provided identifier.',
      },
    })
  })
})

describe('ministry mutations', () => {
  it('creates a ministry', async () => {
    const response = await request(createApp())
      .post('/directory/ministries')
      .set(ADMIN)
      .send({ name: 'Ministry of Finance and the Public Service' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: SERIALIZED_MINISTRY, error: null })
  })

  it('rejects a missing name', async () => {
    const response = await request(createApp())
      .post('/directory/ministries')
      .set(ADMIN)
      .send({ portfolio: 'Finance' })

    expect(response.status).toBe(422)
    expect(ministry.create).not.toHaveBeenCalled()
  })

  it('refuses an app-key caller', async () => {
    const response = await request(createApp())
      .post('/directory/ministries')
      .set(KEY_ONLY)
      .send({ name: 'X' })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/no-session')
    expect(ministry.create).not.toHaveBeenCalled()
  })

  it('rejects an empty update', async () => {
    const response = await request(createApp())
      .patch('/directory/ministries/min_3a')
      .set(ADMIN)
      .send({})

    expect(response.status).toBe(400)
    expect(ministry.update).not.toHaveBeenCalled()
  })

  it('returns a tombstone on delete', async () => {
    const response = await request(createApp())
      .delete('/directory/ministries/min_3a')
      .set(ADMIN)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { object: 'ministry', id: 'min_3a', deleted: true },
      error: null,
    })
  })

  it('answers 404 when the delete matched nothing', async () => {
    ministry.deleteMany.mockResolvedValue({ count: 0 })

    const response = await request(createApp())
      .delete('/directory/ministries/min_missing')
      .set(ADMIN)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('ministry/not-found')
  })
})

describe('ministry departments', () => {
  it('returns the department list with its nested address', async () => {
    const response = await request(createApp())
      .get('/directory/ministries/min_3a/departments')
      .set(KEY_ONLY)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [SERIALIZED_DEPARTMENT],
        has_more: false,
        url: '/directory/ministries/min_3a/departments',
        total_count: null,
      },
      error: null,
    })
  })

  it('scopes the list to its parent ministry', async () => {
    await request(createApp())
      .get('/directory/ministries/min_3a/departments')
      .set(KEY_ONLY)

    expect(ministryDepartment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ministryId: 'min_3a', deletedAt: null },
      })
    )
  })

  it('answers 404 when the parent ministry is absent', async () => {
    ministry.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/directory/ministries/min_missing/departments')
      .set(KEY_ONLY)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('ministry/not-found')
    expect(ministryDepartment.findMany).not.toHaveBeenCalled()
  })

  it('creates the department and its address in one write', async () => {
    const response = await request(createApp())
      .post('/directory/ministries/min_3a/departments')
      .set(ADMIN)
      .send({
        name: 'Taxpayer Audit and Assessment',
        contact_email: 'taad@mof.gov.jm',
        address: {
          line1: '30 National Heroes Circle',
          city: 'Kingston',
          state: 'Kingston',
          latitude: 17.9889,
          longitude: -76.7834,
        },
      })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: SERIALIZED_DEPARTMENT, error: null })
    expect(ministryDepartment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ministry: { connect: { id: 'min_3a' } },
          contactEmail: 'taad@mof.gov.jm',
          directoryAddress: {
            create: expect.objectContaining({
              line1: '30 National Heroes Circle',
            }),
          },
        }),
      })
    )
  })

  it('answers 404 when creating under an absent ministry', async () => {
    ministry.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/directory/ministries/min_missing/departments')
      .set(ADMIN)
      .send({
        name: 'X',
        address: {
          line1: '1 Road',
          city: 'Kingston',
          state: 'Kingston',
          latitude: 18,
          longitude: -76,
        },
      })

    expect(response.status).toBe(404)
    expect(ministryDepartment.create).not.toHaveBeenCalled()
  })

  it('renames contact_email to the Prisma field on update', async () => {
    await request(createApp())
      .patch('/directory/ministry-departments/mind_8b')
      .set(ADMIN)
      .send({ contact_email: 'new@mof.gov.jm' })

    expect(ministryDepartment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ contactEmail: 'new@mof.gov.jm' }),
      })
    )
  })

  it('answers 404 with the department code', async () => {
    ministryDepartment.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/directory/ministry-departments/mind_missing')
      .set(KEY_ONLY)

    expect(response.status).toBe(404)
    expect(response.body.error).toEqual({
      code: 'ministry_department/not-found',
      message: 'No ministry department exists with the provided identifier.',
    })
  })
})
