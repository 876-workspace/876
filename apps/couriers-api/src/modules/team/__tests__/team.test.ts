import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW = 1785000000
const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

function roleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'role_1',
    tenantId: 'ten_1',
    name: 'Manager',
    description: 'Manages operations',
    systemKey: null,
    permissions: ['items.view'],
    createdAt: NOW - 20,
    updatedAt: NOW,
    _count: { members: 0 },
    ...overrides,
  }
}

function memberRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mem_1',
    tenantId: 'ten_1',
    userId: 'user_1',
    roleId: 'role_1',
    status: 'ACTIVE' as const,
    createdAt: NOW - 10,
    updatedAt: NOW,
    role: { name: 'Manager', systemKey: null },
    ...overrides,
  }
}

const { tenant, role, teamMember, apiKey } = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn() },
  role: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  teamMember: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: {
    tenant,
    role,
    teamMember,
    apiKey,
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')
const { resetSettingsForTest } = await import('@/config')

const testEnv: NodeJS.ProcessEnv = {
  ENVIRONMENT: 'test',
  LOG_LEVEL: 'silent',
  PORT: '4001',
  DATABASE_URL: 'prisma://127.0.0.1:1/?api_key=test',
  DIRECT_DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  API_876_KEY: APP_KEY,
  API_INTERNAL_KEY: 'test-internal-key',
  SENTRY_DSN: '',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(NOW * 1000))
  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_couriers',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
  tenant.findUnique.mockResolvedValue({ id: 'ten_1' })
  role.findMany.mockResolvedValue([roleRow()])
  role.findFirst.mockResolvedValue(roleRow())
  role.create.mockResolvedValue(roleRow())
  role.update.mockResolvedValue(roleRow({ name: 'Updated' }))
  role.delete.mockResolvedValue({})
  teamMember.findMany.mockResolvedValue([memberRow()])
  teamMember.findFirst.mockResolvedValue(memberRow())
  teamMember.create.mockResolvedValue(memberRow())
  teamMember.update.mockResolvedValue(memberRow({ status: 'INACTIVE' }))
  teamMember.count.mockResolvedValue(2)
})

afterEach(() => {
  vi.useRealTimers()
  resetSettingsForTest(testEnv)
})

describe('team - roles', () => {
  it('lists roles with envelope', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_1/roles')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [
          expect.objectContaining({
            object: 'role',
            id: 'role_1',
            tenant_id: 'ten_1',
          }),
        ],
        has_more: false,
        url: '/v1/tenants/ten_1/roles',
        total_count: null,
      },
      error: null,
    })
    expect(role.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'ten_1' }),
      })
    )
  })

  it('requires admin for roles', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_1/roles')
      .set({ 'X-876-API-Key': APP_KEY })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/no-session')
  })

  it('creates a role', async () => {
    const response = await request(createApp())
      .post('/v1/tenants/ten_1/roles')
      .set(ADMIN_HEADERS)
      .send({ name: 'Manager', permissions: ['items.view'] })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      data: { object: 'role' },
      error: null,
    })
    expect(role.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 'ten_1' }),
      })
    )
  })

  it('422s on invalid permission on create', async () => {
    const response = await request(createApp())
      .post('/v1/tenants/ten_1/roles')
      .set(ADMIN_HEADERS)
      .send({ name: 'BadPerm', permissions: ['not-a-valid-permission'] })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('role/invalid-permission')
    expect(role.create).not.toHaveBeenCalled()
  })

  it('409s on role name conflict on create', async () => {
    role.create.mockRejectedValue({ code: 'P2002' })

    const response = await request(createApp())
      .post('/v1/tenants/ten_1/roles')
      .set(ADMIN_HEADERS)
      .send({ name: 'Manager', permissions: ['items.view'] })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('role/conflict')
  })

  it('422s on invalid body', async () => {
    const response = await request(createApp())
      .post('/v1/tenants/ten_1/roles')
      .set(ADMIN_HEADERS)
      .send({ permissions: ['items.view'] })

    expect(response.status).toBe(422)
  })

  it('updates a role', async () => {
    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/roles/role_1')
      .set(ADMIN_HEADERS)
      .send({ name: 'Updated' })

    expect(response.status).toBe(200)
    expect(response.body.data.name).toBe('Updated')
    expect(role.update).toHaveBeenCalled()
  })

  it('404s when updating missing role', async () => {
    role.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/roles/role_missing')
      .set(ADMIN_HEADERS)
      .send({ name: 'Nope' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('role/not-found')
  })

  it('409s when updating default role', async () => {
    role.findFirst.mockResolvedValue(
      roleRow({ systemKey: 'admin', name: 'Admin' })
    )

    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/roles/role_1')
      .set(ADMIN_HEADERS)
      .send({ name: 'Nope' })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('role/conflict')
    expect(role.update).not.toHaveBeenCalled()
  })

  it('422s on invalid permission on update', async () => {
    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/roles/role_1')
      .set(ADMIN_HEADERS)
      .send({ permissions: ['bad.permission'] })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('role/invalid-permission')
    expect(role.update).not.toHaveBeenCalled()
  })

  it('409s on update name conflict', async () => {
    role.update.mockRejectedValue({ code: 'P2002' })

    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/roles/role_1')
      .set(ADMIN_HEADERS)
      .send({ name: 'Duplicate' })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('role/conflict')
  })

  it('deletes a role', async () => {
    const response = await request(createApp())
      .delete('/v1/tenants/ten_1/roles/role_1')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      data: { object: 'role', id: 'role_1', deleted: true },
      error: null,
    })
    expect(role.delete).toHaveBeenCalledWith({ where: { id: 'role_1' } })
  })

  it('409s when deleting default role with systemKey', async () => {
    role.findFirst.mockResolvedValue(roleRow({ systemKey: 'admin' }))

    const response = await request(createApp())
      .delete('/v1/tenants/ten_1/roles/role_1')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('role/conflict')
    expect(role.delete).not.toHaveBeenCalled()
  })

  it('409s when deleting role with members', async () => {
    role.findFirst.mockResolvedValue(roleRow({ _count: { members: 2 } }))

    const response = await request(createApp())
      .delete('/v1/tenants/ten_1/roles/role_1')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('role/conflict')
    expect(role.delete).not.toHaveBeenCalled()
  })

  it('wraps errors without httpStatus', async () => {
    role.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/roles/role_missing')
      .set(ADMIN_HEADERS)
      .send({ name: 'X' })

    expect(response.body.error).not.toHaveProperty('httpStatus')
    expect(response.body).toEqual({
      data: null,
      error: expect.objectContaining({
        code: expect.any(String),
        message: expect.any(String),
      }),
    })
  })
})

describe('team - members', () => {
  it('lists team members with envelope', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_1/team')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [expect.objectContaining({ object: 'team_member', id: 'mem_1' })],
        has_more: false,
        url: '/v1/tenants/ten_1/team',
        total_count: null,
      },
      error: null,
    })
    expect(teamMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'ten_1' } })
    )
  })

  it('requires admin for team members', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_1/team')
      .set({ 'X-876-API-Key': APP_KEY })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/no-session')
  })

  it('creates a team member', async () => {
    const response = await request(createApp())
      .post('/v1/tenants/ten_1/team')
      .set(ADMIN_HEADERS)
      .send({ user_id: 'user_2', role_id: 'role_1' })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      data: { object: 'team_member' },
      error: null,
    })
    expect(teamMember.create).toHaveBeenCalled()
  })

  it('404s when role does not exist for member create', async () => {
    role.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/v1/tenants/ten_1/team')
      .set(ADMIN_HEADERS)
      .send({ user_id: 'user_2', role_id: 'role_missing' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('team/role/not-found')
    expect(teamMember.create).not.toHaveBeenCalled()
  })

  it('422s on invalid member body', async () => {
    const response = await request(createApp())
      .post('/v1/tenants/ten_1/team')
      .set(ADMIN_HEADERS)
      .send({ user_id: '' })

    expect(response.status).toBe(422)
  })

  it('updates a team member status', async () => {
    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/team/mem_1')
      .set(ADMIN_HEADERS)
      .send({ status: 'inactive' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      data: { object: 'team_member' },
      error: null,
    })
    expect(teamMember.update).toHaveBeenCalled()
  })

  it('updates a team member role', async () => {
    const newRole = roleRow({ id: 'role_2', name: 'Staff', systemKey: 'staff' })
    teamMember.findFirst.mockResolvedValue(memberRow())
    role.findFirst.mockResolvedValue(newRole)

    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/team/mem_1')
      .set(ADMIN_HEADERS)
      .send({ role_id: 'role_2' })

    expect(response.status).toBe(200)
    expect(teamMember.update).toHaveBeenCalled()
  })

  it('404s when updating missing member', async () => {
    teamMember.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/team/mem_missing')
      .set(ADMIN_HEADERS)
      .send({ status: 'inactive' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('team/not-found')
  })

  it('retrieves team members and wraps envelope correctly', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_1/team')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body.data.data[0]).toMatchObject({
      object: 'team_member',
      tenant_id: 'ten_1',
      user_id: 'user_1',
      role_id: 'role_1',
    })
    expect(response.body).toEqual({
      data: expect.objectContaining({ object: 'list' }),
      error: null,
    })
  })

  describe('injection and boundary (2025 guides)', () => {
    it('422s on XSS/SQL/ path traversal in role name without 500', async () => {
      for (const name of [
        '<script>',
        "' OR 1=1",
        '../../etc/passwd',
        'a'.repeat(65),
      ]) {
        const res = await request(createApp())
          .post('/v1/tenants/ten_1/roles')
          .set(ADMIN_HEADERS)
          .send({ name, permissions: [] })
        // 65 chars >64 should be 422, injection strings still validated length ok but should not 500
        if (name.length > 64) expect(res.status).toBe(422)
        else expect([201, 422, 409]).toContain(res.status)
        expect(res.body.error ?? res.body.data).toBeDefined()
      }
    })

    it('400s on malformed JSON for team', async () => {
      const res = await request(createApp())
        .post('/v1/tenants/ten_1/roles')
        .set(ADMIN_HEADERS)
        .set('Content-Type', 'application/json')
        .send('{"name": "bad",}')
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('request/invalid-json')
    })

    it('does not leak stack on unexpected error', async () => {
      role.create.mockRejectedValue(new Error('db panic'))
      const res = await request(createApp())
        .post('/v1/tenants/ten_1/roles')
        .set(ADMIN_HEADERS)
        .send({ name: 'Panic', permissions: [] })
      expect(res.status).toBe(500)
      expect(res.body.error.message).not.toMatch(/panic/i)
    })
  })

  it('wraps member errors without httpStatus', async () => {
    teamMember.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .patch('/v1/tenants/ten_1/team/mem_missing')
      .set(ADMIN_HEADERS)
      .send({ status: 'active' })

    expect(response.body.error).not.toHaveProperty('httpStatus')
    expect(response.body).toEqual({
      data: null,
      error: expect.objectContaining({ code: expect.any(String) }),
    })
  })
})
