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
    })
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
})
