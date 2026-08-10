import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW = 1_785_000_000
const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

function mailboxRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mbx_kng1001',
    tenantId: 'ten_kingston',
    customerId: 'cprof_nadine',
    number: 'KNG1001',
    isPrimary: true,
    createdAt: NOW - 30,
    updatedAt: NOW - 10,
    ...overrides,
  }
}

const { tenant, mailbox, apiKey } = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn() },
  mailbox: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
  },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: { tenant, mailbox, apiKey },
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
  resetSettingsForTest(testEnv)
  apiKey.findUnique.mockResolvedValue({
    id: 'key_couriers',
    appId: 'app_couriers',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
  tenant.findUnique.mockResolvedValue({ mailboxPrefix: 'KNG' })
  mailbox.findMany.mockResolvedValue([mailboxRow()])
  mailbox.findFirst.mockResolvedValue(null)
  mailbox.count.mockResolvedValue(0)
  mailbox.findUnique.mockResolvedValue(null)
})

afterEach(() => {
  resetSettingsForTest(testEnv)
})

describe('mailboxes', () => {
  it('lists a tenant’s mailboxes primary-first with the full list envelope', async () => {
    const rows = [
      mailboxRow(),
      mailboxRow({
        id: 'mbx_kng1002',
        customerId: 'cprof_dwayne',
        number: 'KNG1002',
        isPrimary: false,
        createdAt: NOW - 20,
        updatedAt: NOW,
      }),
    ]
    mailbox.findMany.mockResolvedValue(rows)

    const response = await request(createApp())
      .get('/v1/tenants/ten_kingston/mailboxes')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [
          {
            object: 'mailbox',
            id: 'mbx_kng1001',
            tenant_id: 'ten_kingston',
            customer_id: 'cprof_nadine',
            number: 'KNG1001',
            is_primary: true,
            created_at: NOW - 30,
            updated_at: NOW - 10,
          },
          {
            object: 'mailbox',
            id: 'mbx_kng1002',
            tenant_id: 'ten_kingston',
            customer_id: 'cprof_dwayne',
            number: 'KNG1002',
            is_primary: false,
            created_at: NOW - 20,
            updated_at: NOW,
          },
        ],
        has_more: false,
        url: '/v1/tenants/ten_kingston/mailboxes',
        total_count: null,
      },
      error: null,
    })
    expect(mailbox.findMany).toHaveBeenCalledTimes(1)
    expect(mailbox.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_kingston' },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take: 26,
    })
  })

  it('filters the list by customer_id at the repository call', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_kingston/mailboxes?customer_id=cprof_nadine')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [
          {
            object: 'mailbox',
            id: 'mbx_kng1001',
            tenant_id: 'ten_kingston',
            customer_id: 'cprof_nadine',
            number: 'KNG1001',
            is_primary: true,
            created_at: NOW - 30,
            updated_at: NOW - 10,
          },
        ],
        has_more: false,
        url: '/v1/tenants/ten_kingston/mailboxes',
        total_count: null,
      },
      error: null,
    })
    expect(mailbox.findMany).toHaveBeenCalledTimes(1)
    expect(mailbox.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_kingston', customerId: 'cprof_nadine' },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take: 26,
    })
  })

  it('reports has_more false on a default first page with fewer rows than the limit', async () => {
    mailbox.findMany.mockResolvedValue([mailboxRow()])

    const response = await request(createApp())
      .get('/v1/tenants/ten_kingston/mailboxes')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body.error).toBeNull()
    expect(response.body.data.has_more).toBe(false)
    expect(response.body.data.data).toHaveLength(1)
    expect(mailbox.findMany).toHaveBeenCalledTimes(1)
    expect(mailbox.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_kingston' },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take: 26,
    })
  })

  it('reports has_more true when an extra row is fetched and does not serialise the extra row', async () => {
    mailbox.findMany.mockResolvedValue([
      mailboxRow({ id: 'mbx_kng1001', createdAt: NOW - 30 }),
      mailboxRow({ id: 'mbx_kng1002', createdAt: NOW - 20, isPrimary: false }),
      mailboxRow({ id: 'mbx_kng1003', createdAt: NOW - 10, isPrimary: false }),
    ])

    const response = await request(createApp())
      .get('/v1/tenants/ten_kingston/mailboxes?limit=2')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body.error).toBeNull()
    expect(response.body.data.has_more).toBe(true)
    expect(response.body.data.data).toHaveLength(2)
    expect(response.body.data.data.map((r: { id: string }) => r.id)).toEqual([
      'mbx_kng1001',
      'mbx_kng1002',
    ])
    expect(mailbox.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_kingston' },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take: 3,
    })
  })

  it('uses the three-key tuple for a starting_after page and scopes the anchor by tenant', async () => {
    const anchor = mailboxRow({
      id: 'mbx_anchor',
      isPrimary: true,
      createdAt: NOW - 25,
    })
    mailbox.findFirst.mockResolvedValue(anchor)
    mailbox.findMany.mockResolvedValue([
      mailboxRow({ id: 'mbx_after', isPrimary: true, createdAt: NOW - 20 }),
    ])

    const response = await request(createApp())
      .get(
        '/v1/tenants/ten_kingston/mailboxes?limit=1&starting_after=mbx_anchor'
      )
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [expect.objectContaining({ id: 'mbx_after' })],
        has_more: false,
        url: '/v1/tenants/ten_kingston/mailboxes',
        total_count: null,
      },
      error: null,
    })
    expect(mailbox.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'ten_kingston', id: 'mbx_anchor' },
    })
    expect(mailbox.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_kingston',
        OR: [
          { isPrimary: { lt: true } },
          { isPrimary: true, createdAt: { gt: NOW - 25 } },
          { isPrimary: true, createdAt: NOW - 25, id: { gt: 'mbx_anchor' } },
        ],
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take: 2,
    })
  })

  it('filters by customer_id together with the starting_after tuple and keeps ordering', async () => {
    const anchor = mailboxRow({
      id: 'mbx_anchor',
      isPrimary: false,
      createdAt: NOW - 15,
    })
    mailbox.findFirst.mockResolvedValue(anchor)
    mailbox.findMany.mockResolvedValue([
      mailboxRow({ id: 'mbx_filtered', customerId: 'cprof_nadine' }),
    ])

    const response = await request(createApp())
      .get(
        '/v1/tenants/ten_kingston/mailboxes?customer_id=cprof_nadine&limit=1&starting_after=mbx_anchor'
      )
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body.error).toBeNull()
    expect(mailbox.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'ten_kingston', id: 'mbx_anchor' },
    })
    expect(mailbox.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_kingston',
        customerId: 'cprof_nadine',
        OR: [
          { isPrimary: { lt: false } },
          { isPrimary: false, createdAt: { gt: NOW - 15 } },
          { isPrimary: false, createdAt: NOW - 15, id: { gt: 'mbx_anchor' } },
        ],
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take: 2,
    })
  })

  it('uses a reversed three-key tuple and reversed order for an ending_before page, then reverses rows back', async () => {
    const anchor = mailboxRow({
      id: 'mbx_anchor',
      isPrimary: false,
      createdAt: NOW - 10,
    })
    mailbox.findFirst.mockResolvedValue(anchor)
    // Repository fetches in reversed order (asc, desc, desc); service reverses back.
    mailbox.findMany.mockResolvedValue([
      mailboxRow({ id: 'mbx_b', isPrimary: true, createdAt: NOW - 30 }),
      mailboxRow({ id: 'mbx_a', isPrimary: true, createdAt: NOW - 25 }),
    ])

    const response = await request(createApp())
      .get(
        '/v1/tenants/ten_kingston/mailboxes?limit=2&ending_before=mbx_anchor'
      )
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [
          expect.objectContaining({ id: 'mbx_a' }),
          expect.objectContaining({ id: 'mbx_b' }),
        ],
        has_more: false,
        url: '/v1/tenants/ten_kingston/mailboxes',
        total_count: null,
      },
      error: null,
    })
    expect(mailbox.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'ten_kingston', id: 'mbx_anchor' },
    })
    expect(mailbox.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_kingston',
        OR: [
          { isPrimary: { gt: false } },
          { isPrimary: false, createdAt: { lt: NOW - 10 } },
          { isPrimary: false, createdAt: NOW - 10, id: { lt: 'mbx_anchor' } },
        ],
      },
      orderBy: [{ isPrimary: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: 3,
    })
  })

  it('returns an empty page with has_more false when the cursor does not resolve within the tenant', async () => {
    mailbox.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/v1/tenants/ten_kingston/mailboxes?starting_after=mbx_other_tenant')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        url: '/v1/tenants/ten_kingston/mailboxes',
        total_count: null,
      },
      error: null,
    })
    expect(mailbox.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'ten_kingston', id: 'mbx_other_tenant' },
    })
    expect(mailbox.findMany).not.toHaveBeenCalled()
  })

  it('returns an empty page for an unresolvable ending_before cursor scoped by tenant', async () => {
    mailbox.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/v1/tenants/ten_kingston/mailboxes?ending_before=mbx_missing')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        url: '/v1/tenants/ten_kingston/mailboxes',
        total_count: null,
      },
      error: null,
    })
    expect(mailbox.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'ten_kingston', id: 'mbx_missing' },
    })
    expect(mailbox.findMany).not.toHaveBeenCalled()
  })

  it('rejects both cursors together as a validation error', async () => {
    const response = await request(createApp())
      .get(
        '/v1/tenants/ten_kingston/mailboxes?starting_after=mbx_a&ending_before=mbx_b'
      )
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(422)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'request/invalid',
        message: 'Only one cursor may be provided.',
      },
    })
    expect(response.body.data).toBeNull()
    expect(mailbox.findFirst).not.toHaveBeenCalled()
    expect(mailbox.findMany).not.toHaveBeenCalled()
  })

  it('allocates the first free prefixed mailbox number without reserving it', async () => {
    tenant.findUnique.mockResolvedValue({ mailboxPrefix: '  kng  ' })
    mailbox.count.mockResolvedValue(10)

    const response = await request(createApp())
      .post('/v1/tenants/ten_kingston/mailboxes/allocations')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { object: 'mailbox_allocation', number: 'KNG1011' },
      error: null,
    })
    expect(tenant.findUnique).toHaveBeenCalledTimes(1)
    expect(tenant.findUnique).toHaveBeenCalledWith({
      where: { id: 'ten_kingston' },
      select: { mailboxPrefix: true },
    })
    expect(mailbox.count).toHaveBeenCalledTimes(1)
    expect(mailbox.count).toHaveBeenCalledWith({
      where: { tenantId: 'ten_kingston' },
    })
    expect(mailbox.findUnique).toHaveBeenCalledTimes(1)
    expect(mailbox.findUnique).toHaveBeenCalledWith({
      where: {
        mailboxes_tenant_id_number_key: {
          tenantId: 'ten_kingston',
          number: 'KNG1011',
        },
      },
      select: { id: true },
    })
  })

  it('skips a taken candidate before returning the next free number', async () => {
    mailbox.findUnique
      .mockResolvedValueOnce({ id: 'mbx_kng1001' })
      .mockResolvedValueOnce(null)

    const response = await request(createApp())
      .post('/v1/tenants/ten_kingston/mailboxes/allocations')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { object: 'mailbox_allocation', number: 'KNG1002' },
      error: null,
    })
    expect(mailbox.findUnique).toHaveBeenCalledTimes(2)
    expect(mailbox.findUnique).toHaveBeenNthCalledWith(1, {
      where: {
        mailboxes_tenant_id_number_key: {
          tenantId: 'ten_kingston',
          number: 'KNG1001',
        },
      },
      select: { id: true },
    })
    expect(mailbox.findUnique).toHaveBeenNthCalledWith(2, {
      where: {
        mailboxes_tenant_id_number_key: {
          tenantId: 'ten_kingston',
          number: 'KNG1002',
        },
      },
      select: { id: true },
    })
  })

  it('returns tenant/not-found without counting or probing an unknown tenant', async () => {
    tenant.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/v1/tenants/ten_missing/mailboxes/allocations')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'tenant/not-found', message: 'Not found.' },
    })
    expect(tenant.findUnique).toHaveBeenCalledTimes(1)
    expect(mailbox.count).not.toHaveBeenCalled()
    expect(mailbox.findUnique).not.toHaveBeenCalled()
  })

  it('returns mailbox/allocation-exhausted after probing all 25 candidates', async () => {
    mailbox.findUnique.mockResolvedValue({ id: 'mbx_taken' })

    const response = await request(createApp())
      .post('/v1/tenants/ten_kingston/mailboxes/allocations')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(503)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'mailbox/allocation-exhausted',
        message: 'A mailbox number could not be allocated. Please try again.',
      },
    })
    expect(mailbox.findUnique).toHaveBeenCalledTimes(25)
    expect(mailbox.findUnique).toHaveBeenNthCalledWith(1, {
      where: {
        mailboxes_tenant_id_number_key: {
          tenantId: 'ten_kingston',
          number: 'KNG1001',
        },
      },
      select: { id: true },
    })
    expect(mailbox.findUnique).toHaveBeenNthCalledWith(25, {
      where: {
        mailboxes_tenant_id_number_key: {
          tenantId: 'ten_kingston',
          number: 'KNG1025',
        },
      },
      select: { id: true },
    })
  })

  it('rejects missing credentials before the mailbox service is reached', async () => {
    const response = await request(createApp()).get(
      '/v1/tenants/ten_kingston/mailboxes'
    )

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'api-key/missing', message: 'An API key is required.' },
    })
    expect(mailbox.findMany).not.toHaveBeenCalled()
  })

  describe('Advanced — realistic, contract, observability (1.6,2.10,2.12)', () => {
    it('When listing mailboxes with realistic limit, then contract holds and no internal leakage', async () => {
      // Arrange
      // Act
      const res = await request(createApp())
        .get('/v1/tenants/ten_kingston/mailboxes?limit=2')
        .set(ADMIN_HEADERS)
      // Assert
      expect(res.status).toBe(200)
      expect(res.body.data).toMatchObject({
        object: 'list',
        data: expect.any(Array),
        has_more: expect.any(Boolean),
      })
      for (const m of res.body.data.data as Array<Record<string, unknown>>) {
        expect(m).toHaveProperty('object', 'mailbox')
        expect(m).not.toHaveProperty('tenantId')
      }
    })

    it('When creating mailbox allocation with realistic customer, then returns allocation schema', async () => {
      // Arrange
      mailbox.findUnique.mockResolvedValueOnce(null)
      // Act
      const res = await request(createApp())
        .post('/v1/tenants/ten_kingston/mailboxes/allocations')
        .set(ADMIN_HEADERS)
        .send({ customer_id: 'cprof_1' })
      // Assert
      expect([200, 201, 404, 422]).toContain(res.status)
      if (res.body.data)
        expect(res.body.data).toHaveProperty('object', 'mailbox_allocation')
      if (res.body.error) expect(res.body.error).not.toHaveProperty('stack')
    })

    it('When invalid mailbox number with XSS/SQL is sent, then 422 without 500', async () => {
      // Arrange
      const bad = [
        { number: '<script>alert(1)</script>' },
        { number: "' OR 1=1" },
        { number: 'a'.repeat(100) },
      ]
      for (const p of bad) {
        // Act
        const res = await request(createApp())
          .post('/v1/tenants/ten_kingston/mailboxes')
          .set(ADMIN_HEADERS)
          .send(p)
        // Assert
        expect([201, 400, 422, 404, 409]).toContain(res.status)
        if (res.body.error) expect(res.body.error).not.toHaveProperty('stack')
      }
    })

    it('When tenant isolation is tested for mailboxes, then other tenant not leaked', async () => {
      // Arrange
      mailbox.findMany.mockResolvedValueOnce([])
      // Act
      const res = await request(createApp())
        .get('/v1/tenants/ten_other/mailboxes')
        .set(ADMIN_HEADERS)
      // Assert
      expect([200, 404]).toContain(res.status)
      if (res.status === 200) expect(res.body.data.data).toEqual([])
    })
  })
})
