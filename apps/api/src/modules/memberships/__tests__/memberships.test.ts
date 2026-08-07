import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { membership, organization, user, apiKey } = vi.hoisted(() => ({
  membership: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
  },
  organization: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: {
    membership,
    organization,
    user,
    apiKey,
    $executeRaw: vi.fn().mockResolvedValue(1),
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

// Only the two functions this module calls are stubbed. Replacing the whole
// module wholesale also blanks its exported constants, and `provisioning-catalog`
// reads `BILLING_APP_SLUG` at module scope — which crashes every suite that
// mounts the provisioning router, not just this one.
vi.mock('@/services/provisioning', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/provisioning')>()),
  linkMembershipRole: vi.fn().mockResolvedValue(undefined),
  assignMemberApps: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/services/identity-sync', () => ({
  ensureProviderMembership: vi.fn().mockResolvedValue(null),
  deleteProviderMembership: vi.fn().mockResolvedValue(false),
}))

// The WorkOS adapter is stubbed rather than the whole config module: mocking
// `@/config` wholesale hands the logger a settings object with no `logLevel`
// and every suite dies before its first test.
vi.mock('@/providers/workos/adapter', () => ({
  getAuthProvider: vi.fn().mockReturnValue({
    createOrganizationMembership: vi.fn(),
    listOrganizationMemberships: vi.fn(),
    deleteOrganizationMembership: vi.fn(),
  }),
}))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const AUTH = { 'X-876-API-Key': APP_KEY, 'x-internal-key': 'test-internal-key' }
const NOW = 1785000000

function membershipRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mem_01',
    organizationId: 'org_01',
    userId: 'user_01',
    workosMembershipId: null,
    role: 'member',
    roleId: null,
    status: 'active',
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_1',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
  membership.findFirst.mockResolvedValue(null)
  membership.findUnique.mockResolvedValue(membershipRow())
  membership.findMany.mockResolvedValue([membershipRow()])
  membership.create.mockResolvedValue(membershipRow())
  membership.update.mockResolvedValue(membershipRow())
  organization.findUnique.mockResolvedValue({
    id: 'org_01',
    workosOrganizationId: null,
  })
  user.findUnique.mockResolvedValue({ id: 'user_01', workosUserId: null })
})

describe('GET /memberships', () => {
  it('returns a list object', async () => {
    membership.findMany.mockResolvedValue([membershipRow()])
    const res = await request(createApp()).get('/memberships').set(AUTH)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      data: {
        object: 'list',
        data: [
          {
            object: 'membership',
            id: 'mem_01',
            organization_id: 'org_01',
            user_id: 'user_01',
            workos_membership_id: null,
            role: 'member',
            role_id: null,
            status: 'active',
            created_at: NOW,
            updated_at: NOW,
          },
        ],
        has_more: false,
        url: '/memberships',
        total_count: null,
      },
      error: null,
    })
  })

  it('is admin-only', async () => {
    const res = await request(createApp())
      .get('/memberships')
      .set('X-876-API-Key', APP_KEY)
    expect(res.status).toBe(401)
  })
})

describe('POST /memberships', () => {
  it('creates a membership', async () => {
    membership.findFirst.mockResolvedValue(null)
    const res = await request(createApp())
      .post('/memberships')
      .set(AUTH)
      .send({ organization_id: 'org_01', user_id: 'user_01' })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      object: 'membership',
      organization_id: 'org_01',
      user_id: 'user_01',
    })
  })

  it('rejects unknown field', async () => {
    const res = await request(createApp())
      .post('/memberships')
      .set(AUTH)
      .send({ organization_id: 'org_01', user_id: 'user_01', unknown: 'x' })
    expect(res.status).toBe(422)
  })

  it('409s duplicate membership', async () => {
    membership.findFirst.mockResolvedValue(membershipRow())
    const res = await request(createApp())
      .post('/memberships')
      .set(AUTH)
      .send({ organization_id: 'org_01', user_id: 'user_01' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('membership/duplicate')
  })

  it('400s missing organization', async () => {
    organization.findUnique.mockResolvedValue(null)
    const res = await request(createApp())
      .post('/memberships')
      .set(AUTH)
      .send({ organization_id: 'org_missing', user_id: 'user_01' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('membership/validation-failed')
  })
})

describe('GET /memberships/:membership_id', () => {
  it('returns the membership', async () => {
    membership.findFirst.mockResolvedValue(membershipRow())
    const res = await request(createApp()).get('/memberships/mem_01').set(AUTH)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe('mem_01')
  })

  it('404s unknown membership', async () => {
    membership.findFirst.mockResolvedValue(null)
    membership.findUnique.mockResolvedValue(null)
    const res = await request(createApp())
      .get('/memberships/mem_missing')
      .set(AUTH)
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('membership/not-found')
  })
})

describe('PATCH /memberships/:membership_id', () => {
  it('updates role', async () => {
    membership.findFirst.mockResolvedValue(membershipRow())
    membership.update.mockResolvedValue(membershipRow({ role: 'admin' }))
    const res = await request(createApp())
      .patch('/memberships/mem_01')
      .set(AUTH)
      .send({ role: 'admin' })
    expect(res.status).toBe(200)
    expect(res.body.data.role).toBe('admin')
  })

  it('400s duplicate workos id', async () => {
    membership.findFirst
      .mockResolvedValueOnce(membershipRow())
      .mockResolvedValueOnce({ id: 'mem_other', workosMembershipId: 'wom_123' })
    const res = await request(createApp())
      .patch('/memberships/mem_01')
      .set(AUTH)
      .send({ workos_membership_id: 'wom_123' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('membership/validation-failed')
  })
})

describe('DELETE /memberships/:membership_id', () => {
  it('deletes membership', async () => {
    membership.findFirst.mockResolvedValue(membershipRow())
    membership.findUnique.mockResolvedValue({ id: 'mem_01', deletedAt: null })
    membership.update.mockResolvedValue({} as never)
    const res = await request(createApp())
      .delete('/memberships/mem_01')
      .set(AUTH)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({
      object: 'membership',
      id: 'mem_01',
      deleted: true,
    })
  })

  it('404s unknown membership', async () => {
    membership.findFirst.mockResolvedValue(null)
    membership.findUnique.mockResolvedValue(null)
    const res = await request(createApp())
      .delete('/memberships/mem_missing')
      .set(AUTH)
    expect(res.status).toBe(404)
  })
})
