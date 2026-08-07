import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { billingAccount, subscription, subscriptionItem, app, price, apiKey } =
  vi.hoisted(() => ({
    billingAccount: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    subscriptionItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    app: { findUnique: vi.fn() },
    price: { findUnique: vi.fn() },
    apiKey: { findUnique: vi.fn(), update: vi.fn() },
  }))

vi.mock('@/db/client', () => ({
  prisma: {
    billingAccount,
    subscription,
    subscriptionItem,
    app,
    price,
    apiKey,
    billingCustomerOutbox: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    financeProvisioningOutbox: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    membership: { findMany: vi.fn() },
    organization: { findMany: vi.fn(), findUnique: vi.fn() },
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    provisioningManifestRevision: { findFirst: vi.fn() },
    provisioningRun: { create: vi.fn() },
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const AUTH = { 'X-876-API-Key': APP_KEY, 'x-internal-key': 'test-internal-key' }
const NOW = 1785000000

function billingAccountRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ba_01',
    organizationId: 'org_01',
    name: null,
    email: null,
    invoiceEmail: null,
    currency: 'JMD',
    taxExempt: null,
    balance: 0,
    defaultPaymentMethodId: null,
    invoiceSettings: null,
    preferredLocales: null,
    address: null,
    shipping: null,
    metadata: null,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
}

function subscriptionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_01',
    organizationId: 'org_01',
    appId: 'app_01',
    billingAccountId: null,
    status: 'active',
    financeLifecycleVersion: 0,
    collectionMethod: null,
    billingCycleAnchor: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAt: null,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    endedAt: null,
    trialStart: null,
    trialEnd: null,
    startDate: null,
    defaultPaymentMethodId: null,
    metadata: null,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    app: {
      slug: 'test-app',
      name: 'Test App',
      logoUrl: null,
      appKind: 'product',
    },
    items: [],
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
  billingAccount.findMany.mockResolvedValue([billingAccountRow()])
  billingAccount.findUnique.mockResolvedValue(billingAccountRow())
  billingAccount.create.mockResolvedValue(billingAccountRow())
  billingAccount.update.mockResolvedValue(billingAccountRow())
  subscription.findMany.mockResolvedValue([subscriptionRow()])
  subscription.findUnique.mockResolvedValue(subscriptionRow() as never)
  subscription.findFirst.mockResolvedValue(subscriptionRow() as never)
  subscription.create.mockResolvedValue(subscriptionRow() as never)
  subscription.update.mockResolvedValue(subscriptionRow() as never)
  subscriptionItem.findFirst.mockResolvedValue(null)
  subscriptionItem.create.mockResolvedValue({
    id: 'sbi_01',
    subscriptionId: 'sub_01',
    priceId: 'prc_01',
    quantity: 1,
    price: { product: { id: 'prd_01', slug: 'test', name: 'Test' } },
  } as never)
  app.findUnique.mockResolvedValue({ id: 'app_01', appKind: 'product' })
  price.findUnique.mockResolvedValue({ id: 'prc_01' })
})

describe('GET /billing/accounts', () => {
  it('returns list', async () => {
    const res = await request(createApp()).get('/billing/accounts').set(AUTH)
    expect(res.status).toBe(200)
    expect(res.body.data.object).toBe('list')
  })
  it('is admin-only', async () => {
    const res = await request(createApp())
      .get('/billing/accounts')
      .set('X-876-API-Key', APP_KEY)
    expect(res.status).toBe(401)
  })
})

describe('POST /billing/accounts', () => {
  it('creates account', async () => {
    const res = await request(createApp())
      .post('/billing/accounts')
      .set(AUTH)
      .send({ organization_id: 'org_01' })
    expect(res.status).toBe(201)
    expect(res.body.data.object).toBe('billing_account')
  })
  it('rejects unknown field', async () => {
    const res = await request(createApp())
      .post('/billing/accounts')
      .set(AUTH)
      .send({ organization_id: 'org_01', unknown: 'x' })
    expect(res.status).toBe(422)
  })
})

describe('GET /billing/accounts/:account_id', () => {
  it('returns account', async () => {
    const res = await request(createApp())
      .get('/billing/accounts/ba_01')
      .set(AUTH)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe('ba_01')
  })
  it('404s missing', async () => {
    billingAccount.findUnique.mockResolvedValue(null)
    const res = await request(createApp())
      .get('/billing/accounts/ba_missing')
      .set(AUTH)
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('billing_account/not-found')
  })
})

describe('PATCH /billing/accounts/:account_id', () => {
  it('updates account', async () => {
    billingAccount.update.mockResolvedValue(billingAccountRow({ name: 'New' }))
    const res = await request(createApp())
      .patch('/billing/accounts/ba_01')
      .set(AUTH)
      .send({ name: 'New' })
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('New')
  })
})

describe('DELETE /billing/accounts/:account_id', () => {
  it('deletes account', async () => {
    billingAccount.findUnique.mockResolvedValue(billingAccountRow())
    billingAccount.delete.mockResolvedValue(billingAccountRow())
    const res = await request(createApp())
      .delete('/billing/accounts/ba_01')
      .set(AUTH)
    expect(res.status).toBe(200)
    expect(res.body.data.deleted).toBe(true)
  })
})

describe('POST /billing/subscriptions', () => {
  it('creates subscription', async () => {
    subscription.findFirst.mockResolvedValue(null)
    const res = await request(createApp())
      .post('/billing/subscriptions')
      .set(AUTH)
      .send({ organization_id: 'org_01', app_id: 'app_01' })
    expect(res.status).toBe(201)
    expect(res.body.data.object).toBe('subscription')
  })
  it('404s missing app', async () => {
    app.findUnique.mockResolvedValue(null)
    const res = await request(createApp())
      .post('/billing/subscriptions')
      .set(AUTH)
      .send({ organization_id: 'org_01', app_id: 'app_missing' })
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('app/not-found')
  })
})

describe('GET /billing/subscriptions', () => {
  it('returns list', async () => {
    const res = await request(createApp())
      .get('/billing/subscriptions')
      .set(AUTH)
    expect(res.status).toBe(200)
    expect(res.body.data.object).toBe('list')
  })
})

describe('GET /billing/subscriptions/:subscription_id', () => {
  it('returns subscription', async () => {
    const res = await request(createApp())
      .get('/billing/subscriptions/sub_01')
      .set(AUTH)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe('sub_01')
  })
  it('404s missing', async () => {
    subscription.findUnique.mockResolvedValue(null)
    const res = await request(createApp())
      .get('/billing/subscriptions/sub_missing')
      .set(AUTH)
    expect(res.status).toBe(404)
  })
})

describe('POST /billing/customer-sync/dispatch', () => {
  it('dispatches', async () => {
    const res = await request(createApp())
      .post('/billing/customer-sync/dispatch')
      .set(AUTH)
    expect(res.status).toBe(200)
    expect(res.body.data.object).toBe('billing_customer_sync_dispatch')
  })
  it('is admin-only', async () => {
    const res = await request(createApp())
      .post('/billing/customer-sync/dispatch')
      .set('X-876-API-Key', APP_KEY)
    expect(res.status).toBe(401)
  })
})

describe('POST /billing/subscriptions/:subscription_id/items', () => {
  it('creates item', async () => {
    const res = await request(createApp())
      .post('/billing/subscriptions/sub_01/items')
      .set(AUTH)
      .send({ price_id: 'prc_01' })
    expect(res.status).toBe(201)
    expect(res.body.data.object).toBe('subscription_item')
  })
  it('404s missing subscription', async () => {
    subscription.findUnique.mockResolvedValue(null)
    const res = await request(createApp())
      .post('/billing/subscriptions/sub_missing/items')
      .set(AUTH)
      .send({ price_id: 'prc_01' })
    expect(res.status).toBe(404)
  })
})
