/**
 * Universities, campuses, and secondary schools.
 *
 * Secondary schools are served under `/schools` — the URL clients already call —
 * while the `object` discriminator and the error codes carry the fuller
 * `secondary_school` name. Both are asserted, because that mismatch is exactly
 * the kind of thing a rename would quietly "tidy".
 */

import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { university, universityCampus, secondarySchool, apiKey } = vi.hoisted(
  () => ({
    university: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    universityCampus: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    secondarySchool: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    apiKey: { findUnique: vi.fn(), update: vi.fn() },
  })
)

vi.mock('@/db/client', () => ({
  prisma: { university, universityCampus, secondarySchool, apiKey },
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

function addressRow() {
  return {
    id: 'diraddr_mona',
    line1: 'Mona Road',
    line2: null,
    city: 'Kingston',
    state: 'Saint Andrew',
    postalCode: null,
    country: 'JM',
    latitude: 18.0056,
    longitude: -76.7469,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
  }
}

const SERIALIZED_ADDRESS = {
  object: 'directory_address',
  id: 'diraddr_mona',
  line1: 'Mona Road',
  line2: null,
  city: 'Kingston',
  state: 'Saint Andrew',
  postal_code: null,
  country: 'JM',
  latitude: 18.0056,
  longitude: -76.7469,
  created_at: NOW,
  updated_at: NOW,
}

function universityRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'uni_1',
    name: 'The University of the West Indies',
    acronym: 'UWI',
    logoUrl: null,
    website: 'https://www.uwi.edu',
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
}

const SERIALIZED_UNIVERSITY = {
  object: 'university',
  id: 'uni_1',
  name: 'The University of the West Indies',
  acronym: 'UWI',
  logo_url: null,
  website: 'https://www.uwi.edu',
  created_at: NOW,
  updated_at: NOW,
}

function campusRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'unic_mona',
    universityId: 'uni_1',
    name: 'Mona Campus',
    isMainCampus: true,
    addressId: 'diraddr_mona',
    contactNumber: '+18769271660',
    email: null,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    directoryAddress: addressRow(),
    ...overrides,
  }
}

const SERIALIZED_CAMPUS = {
  object: 'university_campus',
  id: 'unic_mona',
  university_id: 'uni_1',
  name: 'Mona Campus',
  is_main_campus: true,
  address_id: 'diraddr_mona',
  contact_number: '+18769271660',
  email: null,
  address: SERIALIZED_ADDRESS,
  created_at: NOW,
  updated_at: NOW,
}

function schoolRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'school_1',
    name: 'Campion College',
    principal: null,
    schoolType: 'traditional high',
    logoUrl: null,
    addressId: 'diraddr_mona',
    contactNumber: null,
    email: null,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    directoryAddress: addressRow(),
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

  university.findMany.mockResolvedValue([universityRow()])
  university.findFirst.mockResolvedValue(universityRow())
  university.findUnique.mockResolvedValue({ id: 'uni_1' })
  university.create.mockResolvedValue(universityRow())
  university.update.mockResolvedValue(universityRow())
  university.updateMany.mockResolvedValue({ count: 1 })
  university.deleteMany.mockResolvedValue({ count: 1 })

  universityCampus.findMany.mockResolvedValue([campusRow()])
  universityCampus.findFirst.mockResolvedValue(campusRow())
  universityCampus.findUnique.mockResolvedValue({ id: 'unic_mona' })
  universityCampus.create.mockResolvedValue(campusRow())
  universityCampus.update.mockResolvedValue(campusRow())
  universityCampus.updateMany.mockResolvedValue({ count: 1 })
  universityCampus.deleteMany.mockResolvedValue({ count: 1 })

  secondarySchool.findMany.mockResolvedValue([schoolRow()])
  secondarySchool.findFirst.mockResolvedValue(schoolRow())
  secondarySchool.findUnique.mockResolvedValue({ id: 'school_1' })
  secondarySchool.create.mockResolvedValue(schoolRow())
  secondarySchool.update.mockResolvedValue(schoolRow())
  secondarySchool.updateMany.mockResolvedValue({ count: 1 })
  secondarySchool.deleteMany.mockResolvedValue({ count: 1 })
})

describe('universities', () => {
  it('returns the university list', async () => {
    const response = await request(createApp())
      .get('/directory/universities')
      .set(KEY_ONLY)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [SERIALIZED_UNIVERSITY],
        has_more: false,
        url: '/directory/universities',
        total_count: null,
      },
      error: null,
    })
  })

  it('hides tombstoned rows from an app-key caller that asks', async () => {
    await request(createApp())
      .get('/directory/universities?include_deleted=true')
      .set(KEY_ONLY)

    expect(university.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null } })
    )
  })

  it('answers 404 with the exact code', async () => {
    university.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/directory/universities/uni_missing')
      .set(KEY_ONLY)

    expect(response.status).toBe(404)
    expect(response.body.error).toEqual({
      code: 'university/not-found',
      message: 'No university exists with the provided identifier.',
    })
  })

  it('renames logo_url on update', async () => {
    await request(createApp())
      .patch('/directory/universities/uni_1')
      .set(ADMIN)
      .send({ logo_url: 'https://cdn.uwi.edu/logo.png' })

    expect(university.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          logoUrl: 'https://cdn.uwi.edu/logo.png',
        }),
      })
    )
  })

  it('refuses an app-key caller on a delete', async () => {
    const response = await request(createApp())
      .delete('/directory/universities/uni_1')
      .set(KEY_ONLY)

    expect(response.status).toBe(401)
    expect(university.deleteMany).not.toHaveBeenCalled()
  })
})

describe('university campuses', () => {
  it('returns the campus list with its nested address', async () => {
    const response = await request(createApp())
      .get('/directory/universities/uni_1/campuses')
      .set(KEY_ONLY)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      object: 'list',
      data: [SERIALIZED_CAMPUS],
      has_more: false,
      url: '/directory/universities/uni_1/campuses',
      total_count: null,
    })
  })

  it('scopes the list to its parent university', async () => {
    await request(createApp())
      .get('/directory/universities/uni_1/campuses')
      .set(KEY_ONLY)

    expect(universityCampus.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { universityId: 'uni_1', deletedAt: null },
      })
    )
  })

  it('defaults is_main_campus to false', async () => {
    await request(createApp())
      .post('/directory/universities/uni_1/campuses')
      .set(ADMIN)
      .send({
        name: 'Western Jamaica Campus',
        address: {
          line1: 'Montego Bay',
          city: 'Montego Bay',
          state: 'Saint James',
          latitude: 18.4762,
          longitude: -77.8939,
        },
      })

    expect(universityCampus.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isMainCampus: false,
          university: { connect: { id: 'uni_1' } },
        }),
      })
    )
  })

  it('renames is_main_campus on update', async () => {
    await request(createApp())
      .patch('/directory/university-campuses/unic_mona')
      .set(ADMIN)
      .send({ is_main_campus: false })

    expect(universityCampus.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isMainCampus: false }),
      })
    )
  })

  it('answers 404 when the parent university is absent', async () => {
    university.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/directory/universities/uni_missing/campuses')
      .set(KEY_ONLY)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('university/not-found')
    expect(universityCampus.findMany).not.toHaveBeenCalled()
  })

  it('answers 404 with the campus code', async () => {
    universityCampus.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/directory/university-campuses/unic_missing')
      .set(KEY_ONLY)

    expect(response.status).toBe(404)
    expect(response.body.error).toEqual({
      code: 'university_campus/not-found',
      message: 'No university campus exists with the provided identifier.',
    })
  })
})

describe('secondary schools', () => {
  it('is served under /schools but serialized as secondary_school', async () => {
    const response = await request(createApp())
      .get('/directory/schools')
      .set(KEY_ONLY)

    expect(response.status).toBe(200)
    expect(response.body.data.url).toBe('/directory/schools')
    expect(response.body.data.data[0]).toEqual({
      object: 'secondary_school',
      id: 'school_1',
      name: 'Campion College',
      principal: null,
      school_type: 'traditional high',
      logo_url: null,
      address_id: 'diraddr_mona',
      contact_number: null,
      email: null,
      address: SERIALIZED_ADDRESS,
      created_at: NOW,
      updated_at: NOW,
    })
  })

  it('creates a school with its address in one write', async () => {
    const response = await request(createApp())
      .post('/directory/schools')
      .set(ADMIN)
      .send({
        name: 'Campion College',
        school_type: 'traditional high',
        address: {
          line1: '105 Hope Road',
          city: 'Kingston',
          state: 'Saint Andrew',
          latitude: 18.0208,
          longitude: -76.7712,
        },
      })

    expect(response.status).toBe(201)
    expect(secondarySchool.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          schoolType: 'traditional high',
          directoryAddress: {
            create: expect.objectContaining({ line1: '105 Hope Road' }),
          },
        }),
      })
    )
  })

  it('answers 404 with the secondary_school code', async () => {
    secondarySchool.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/directory/schools/school_missing')
      .set(KEY_ONLY)

    expect(response.status).toBe(404)
    expect(response.body.error).toEqual({
      code: 'secondary_school/not-found',
      message: 'No secondary school exists with the provided identifier.',
    })
  })

  it('returns a secondary_school tombstone on delete', async () => {
    const response = await request(createApp())
      .delete('/directory/schools/school_1')
      .set(ADMIN)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { object: 'secondary_school', id: 'school_1', deleted: true },
      error: null,
    })
  })

  it('rejects an empty update', async () => {
    const response = await request(createApp())
      .patch('/directory/schools/school_1')
      .set(ADMIN)
      .send({})

    expect(response.status).toBe(400)
    expect(secondarySchool.update).not.toHaveBeenCalled()
  })

  it('accepts an address-only update', async () => {
    const response = await request(createApp())
      .patch('/directory/schools/school_1')
      .set(ADMIN)
      .send({ address: { city: 'Montego Bay' } })

    expect(response.status).toBe(200)
    expect(secondarySchool.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          directoryAddress: {
            update: expect.objectContaining({ city: 'Montego Bay' }),
          },
        }),
      })
    )
  })
})
