import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { product, price, planModule, applicationModule, app, taxCode, apiKey } =
  vi.hoisted(() => ({
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    price: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    planModule: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    applicationModule: { findMany: vi.fn() },
    app: { findUnique: vi.fn() },
    taxCode: { findUnique: vi.fn() },
    apiKey: { findUnique: vi.fn(), update: vi.fn() },
  }))

vi.mock('@/db/client', () => ({
  prisma: {
    product,
    price,
    planModule,
    applicationModule,
    app,
    taxCode,
    apiKey,
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const KEY_ONLY = { 'X-876-API-Key': APP_KEY }
const AUTH = { ...KEY_ONLY, 'x-internal-key': 'test-internal-key' }
const NOW = 1785000000

function priceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prc_4kW2',
    productId: 'prd_9tQ6',
    billingInterval: 'month',
    intervalCount: 1,
    status: 'active',
    unitAmount: BigInt(150000),
    unitAmountDecimal: null,
    currency: 'jmd',
    lookupKey: null,
    name: 'Monthly',
    nickname: null,
    type: 'recurring',
    billingScheme: 'per_unit',
    tiersMode: null,
    tiers: null,
    recurring: null,
    taxBehavior: null,
    transformQuantity: null,
    trialPeriodDays: null,
    active: true,
    metadata: null,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    archivedAt: null,
    ...overrides,
  }
}

function productRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prd_9tQ6',
    slug: '876-couriers-pro',
    name: 'Pro',
    description: 'The paid courier plan',
    appId: 'app_couriers',
    status: 'active',
    active: true,
    statementDescriptor: null,
    unitLabel: null,
    taxCodeId: null,
    lookupKey: null,
    metadata: null,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    archivedAt: null,
    app: {
      slug: '876-couriers',
      name: 'Couriers',
      logoUrl: null,
      appKind: 'product',
    },
    prices: [priceRow()],
    planModules: [{ moduleId: 'mod_deliveries' }],
    ...overrides,
  }
}

const SERIALIZED_PRICE = {
  object: 'price',
  id: 'prc_4kW2',
  product_id: 'prd_9tQ6',
  billing_interval: 'month',
  interval_count: 1,
  status: 'active',
  unit_amount: 150000,
  unit_amount_decimal: null,
  currency: 'jmd',
  lookup_key: null,
  name: 'Monthly',
  nickname: null,
  type: 'recurring',
  billing_scheme: 'per_unit',
  tiers_mode: null,
  tiers: null,
  recurring: null,
  tax_behavior: null,
  transform_quantity: null,
  trial_period_days: null,
  active: true,
  metadata: null,
  created_at: NOW,
  updated_at: NOW,
  archived_at: null,
}

const SERIALIZED_PRODUCT = {
  object: 'product',
  id: 'prd_9tQ6',
  slug: '876-couriers-pro',
  name: 'Pro',
  description: 'The paid courier plan',
  app_id: 'app_couriers',
  app_slug: '876-couriers',
  app_name: 'Couriers',
  app_logo_url: null,
  app_kind: 'product',
  status: 'active',
  active: true,
  statement_descriptor: null,
  unit_label: null,
  tax_code_id: null,
  lookup_key: null,
  metadata: null,
  prices: [SERIALIZED_PRICE],
  module_ids: ['mod_deliveries'],
  created_at: NOW,
  updated_at: NOW,
  archived_at: null,
}

/** The repository looks products up by id and by slug through the same Prisma
 * method, so the stub branches on which key the caller filtered by. */
function stubProductLookup(options: { byId?: unknown; bySlug?: unknown } = {}) {
  // `in` rather than `??`: an explicit `null` is the "does not exist" case and
  // must not fall through to the default row.
  const byId = 'byId' in options ? options.byId : productRow()
  const bySlug = 'bySlug' in options ? options.bySlug : null

  product.findUnique.mockImplementation(
    ({ where }: { where: { id?: string; slug?: string } }) =>
      Promise.resolve(where.slug !== undefined ? bySlug : byId)
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  // Only `Date` is faked: supertest drives real sockets, and faking timers
  // wholesale would stall the request rather than freeze the clock.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW * 1000)

  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_4qR8',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})

  stubProductLookup()
  product.findMany.mockResolvedValue([productRow()])
  product.create.mockResolvedValue(productRow())
  product.update.mockResolvedValue(productRow())

  price.findUnique.mockResolvedValue(priceRow())
  price.create.mockResolvedValue(priceRow())
  price.update.mockResolvedValue(priceRow())

  planModule.findMany.mockResolvedValue([{ moduleId: 'mod_deliveries' }])
  planModule.deleteMany.mockResolvedValue({ count: 0 })
  planModule.createMany.mockResolvedValue({ count: 0 })

  applicationModule.findMany.mockResolvedValue([
    { id: 'mod_deliveries', appId: 'app_couriers', status: 'active' },
  ])
  app.findUnique.mockResolvedValue({ id: 'app_couriers', appKind: 'product' })
  taxCode.findUnique.mockResolvedValue({ id: 'txcd_1' })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /products', () => {
  it('returns the catalog with prices and plan modules', async () => {
    const response = await request(createApp()).get('/products').set(KEY_ONLY)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [SERIALIZED_PRODUCT],
        has_more: false,
        url: '/products',
        total_count: null,
      },
      error: null,
    })
  })

  it('reads with an app key alone, without the internal key', async () => {
    // A pricing page has to render before anyone signs in.
    const response = await request(createApp()).get('/products').set(KEY_ONLY)

    expect(response.status).toBe(200)
  })

  it('rejects a caller with no API key', async () => {
    const response = await request(createApp()).get('/products')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('api-key/missing')
  })

  it('filters by app and status', async () => {
    await request(createApp())
      .get('/products?appId=app_couriers&status=archived')
      .set(KEY_ONLY)

    expect(product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { appId: 'app_couriers', status: 'archived' },
      })
    )
  })

  it('applies no filter when neither parameter is sent', async () => {
    await request(createApp()).get('/products').set(KEY_ONLY)

    expect(product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    )
  })

  it('orders oldest first', async () => {
    await request(createApp()).get('/products').set(KEY_ONLY)

    expect(product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'asc' } })
    )
  })

  it('degrades a malformed metadata column to null', async () => {
    // One bad row must cost that row its metadata, not the whole list.
    product.findMany.mockResolvedValue([
      productRow({ metadata: 'not-an-object' }),
    ])

    const response = await request(createApp()).get('/products').set(KEY_ONLY)

    expect(response.status).toBe(200)
    expect(response.body.data.data[0].metadata).toBeNull()
  })
})

describe('GET /products/:product_id', () => {
  it('returns the product', async () => {
    const response = await request(createApp())
      .get('/products/prd_9tQ6')
      .set(KEY_ONLY)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: SERIALIZED_PRODUCT, error: null })
  })

  it('404s an unknown product', async () => {
    stubProductLookup({ byId: null })

    const response = await request(createApp())
      .get('/products/prd_gone')
      .set(KEY_ONLY)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('product/not-found')
  })
})

describe('POST /products', () => {
  const BODY = {
    slug: '876-couriers-pro',
    name: 'Pro',
    price: { unit_amount: 150000, billing_interval: 'month', name: 'Monthly' },
  }

  it('creates the product and its initial price', async () => {
    const response = await request(createApp())
      .post('/products')
      .set(AUTH)
      .send(BODY)

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: SERIALIZED_PRODUCT, error: null })
    expect(product.create).toHaveBeenCalledTimes(1)
    expect(price.create).toHaveBeenCalledTimes(1)
  })

  it('writes the price amount as the BigInt the column expects', async () => {
    await request(createApp()).post('/products').set(AUTH).send(BODY)

    const data = price.create.mock.calls[0]?.[0].data as Record<string, unknown>
    expect(data.unitAmount).toBe(BigInt(150000))
    expect(data.currency).toBe('jmd')
    expect(data.billingInterval).toBe('month')
    expect(data.status).toBe('active')
  })

  it('leaves the not-yet-persisted price fields to their column defaults', async () => {
    // `type`, `recurring`, `lookup_key`, and `metadata` are accepted on the
    // request and written by neither service.
    await request(createApp())
      .post('/products')
      .set(AUTH)
      .send({
        ...BODY,
        price: {
          ...BODY.price,
          type: 'one_time',
          recurring: { interval: 'month' },
          lookup_key: 'pro_monthly',
          metadata: { tier: 'pro' },
        },
      })

    const data = price.create.mock.calls[0]?.[0].data as Record<string, unknown>
    expect(data).not.toHaveProperty('type')
    expect(data).not.toHaveProperty('recurring')
    expect(data).not.toHaveProperty('lookupKey')
    expect(data).not.toHaveProperty('metadata')
  })

  it('refuses a duplicate slug', async () => {
    stubProductLookup({ bySlug: productRow() })

    const response = await request(createApp())
      .post('/products')
      .set(AUTH)
      .send(BODY)

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('product/duplicate-slug')
    expect(product.create).not.toHaveBeenCalled()
  })

  it('404s an unknown app', async () => {
    app.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/products')
      .set(AUTH)
      .send({ ...BODY, app_id: 'app_gone' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('app/not-found')
    expect(product.create).not.toHaveBeenCalled()
  })

  it('refuses a product scoped to a non-product app', async () => {
    app.findUnique.mockResolvedValue({ id: 'app_console', appKind: 'internal' })

    const response = await request(createApp())
      .post('/products')
      .set(AUTH)
      .send({ ...BODY, app_id: 'app_console' })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('product/app-kind-invalid')
  })

  it('404s an unknown tax code', async () => {
    taxCode.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/products')
      .set(AUTH)
      .send({ ...BODY, tax_code_id: 'txcd_gone' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('tax_code/not-found')
  })

  it('refuses modules on a plan with no app', async () => {
    const response = await request(createApp())
      .post('/products')
      .set(AUTH)
      .send({ ...BODY, module_ids: ['mod_deliveries'] })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('plan-module/missing-app')
  })

  it('refuses a module that does not exist', async () => {
    applicationModule.findMany.mockResolvedValue([])

    const response = await request(createApp())
      .post('/products')
      .set(AUTH)
      .send({
        ...BODY,
        app_id: 'app_couriers',
        module_ids: ['mod_deliveries'],
      })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('plan-module/not-found')
  })

  it('refuses a module owned by another app', async () => {
    // A plan-wide entitlement to another app's module would grant access the
    // subscribing organization never bought.
    applicationModule.findMany.mockResolvedValue([
      { id: 'mod_deliveries', appId: 'app_console', status: 'active' },
    ])

    const response = await request(createApp())
      .post('/products')
      .set(AUTH)
      .send({
        ...BODY,
        app_id: 'app_couriers',
        module_ids: ['mod_deliveries'],
      })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('plan-module/app-mismatch')
  })

  it('refuses an archived module', async () => {
    applicationModule.findMany.mockResolvedValue([
      { id: 'mod_deliveries', appId: 'app_couriers', status: 'archived' },
    ])

    const response = await request(createApp())
      .post('/products')
      .set(AUTH)
      .send({
        ...BODY,
        app_id: 'app_couriers',
        module_ids: ['mod_deliveries'],
      })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('plan-module/app-mismatch')
  })

  it('deduplicates repeated module ids before validating them', async () => {
    await request(createApp())
      .post('/products')
      .set(AUTH)
      .send({
        ...BODY,
        app_id: 'app_couriers',
        module_ids: ['mod_deliveries', 'mod_deliveries'],
      })

    expect(applicationModule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['mod_deliveries'] } } })
    )
  })

  it('rejects a body with no price', async () => {
    const response = await request(createApp())
      .post('/products')
      .set(AUTH)
      .send({ slug: '876-couriers-pro', name: 'Pro' })

    expect(response.status).toBe(422)
    expect(product.create).not.toHaveBeenCalled()
  })

  it('rejects an unknown field', async () => {
    const response = await request(createApp())
      .post('/products')
      .set(AUTH)
      .send({ ...BODY, unexpected: true })

    expect(response.status).toBe(422)
  })

  it('is admin-only', async () => {
    const response = await request(createApp())
      .post('/products')
      .set(KEY_ONLY)
      .send(BODY)

    expect(response.status).toBe(401)
    expect(product.create).not.toHaveBeenCalled()
  })
})

describe('PUT /products/:product_id/modules', () => {
  it('writes only the difference in each direction', async () => {
    // Re-inserting every row would churn `created_at` on modules the caller
    // left alone.
    planModule.findMany.mockResolvedValue([
      { moduleId: 'mod_deliveries' },
      { moduleId: 'mod_stale' },
    ])
    applicationModule.findMany.mockResolvedValue([
      { id: 'mod_deliveries', appId: 'app_couriers', status: 'active' },
      { id: 'mod_items', appId: 'app_couriers', status: 'active' },
    ])

    const response = await request(createApp())
      .put('/products/prd_9tQ6/modules')
      .set(AUTH)
      .send({ module_ids: ['mod_deliveries', 'mod_items'] })

    expect(response.status).toBe(200)
    expect(planModule.deleteMany).toHaveBeenCalledWith({
      where: { productId: 'prd_9tQ6', moduleId: { in: ['mod_stale'] } },
    })
    expect(planModule.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ moduleId: 'mod_items' })],
    })
  })

  it('clears every module when sent an empty set', async () => {
    planModule.findMany.mockResolvedValue([{ moduleId: 'mod_deliveries' }])

    const response = await request(createApp())
      .put('/products/prd_9tQ6/modules')
      .set(AUTH)
      .send({ module_ids: [] })

    expect(response.status).toBe(200)
    expect(planModule.deleteMany).toHaveBeenCalledWith({
      where: { productId: 'prd_9tQ6', moduleId: { in: ['mod_deliveries'] } },
    })
    expect(planModule.createMany).not.toHaveBeenCalled()
  })

  it('404s an unknown product', async () => {
    stubProductLookup({ byId: null })

    const response = await request(createApp())
      .put('/products/prd_gone/modules')
      .set(AUTH)
      .send({ module_ids: [] })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('product/not-found')
  })

  it('refuses a module owned by another app', async () => {
    applicationModule.findMany.mockResolvedValue([
      { id: 'mod_other', appId: 'app_console', status: 'active' },
    ])

    const response = await request(createApp())
      .put('/products/prd_9tQ6/modules')
      .set(AUTH)
      .send({ module_ids: ['mod_other'] })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('plan-module/app-mismatch')
    expect(planModule.createMany).not.toHaveBeenCalled()
  })

  it('reads the product id from the first segment, not the whole path', async () => {
    await request(createApp())
      .put('/products/prd_9tQ6/modules')
      .set(AUTH)
      .send({ module_ids: [] })

    expect(product.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'prd_9tQ6' } })
    )
  })
})

describe('PATCH /products/:product_id', () => {
  it('applies the fields that were sent', async () => {
    const response = await request(createApp())
      .patch('/products/prd_9tQ6')
      .set(AUTH)
      .send({ name: 'Pro Plus', description: null })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: SERIALIZED_PRODUCT, error: null })

    const data = product.update.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >
    expect(data.name).toBe('Pro Plus')
    expect(data.description).toBeNull()
    expect(data.updatedAt).toBe(BigInt(NOW))
  })

  it('leaves a field alone when its key is absent', async () => {
    await request(createApp())
      .patch('/products/prd_9tQ6')
      .set(AUTH)
      .send({ name: 'Pro Plus' })

    const data = product.update.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >
    expect(data).not.toHaveProperty('description')
    expect(data).not.toHaveProperty('metadata')
  })

  it('rejects an empty body before looking the product up', async () => {
    const response = await request(createApp())
      .patch('/products/prd_9tQ6')
      .set(AUTH)
      .send({})

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('product/no-updates')
    expect(product.update).not.toHaveBeenCalled()
  })

  it('refuses a whitespace-only slug', async () => {
    const response = await request(createApp())
      .patch('/products/prd_9tQ6')
      .set(AUTH)
      .send({ slug: '   ' })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('product/invalid-slug')
  })

  it('trims the slug before storing it', async () => {
    const response = await request(createApp())
      .patch('/products/prd_9tQ6')
      .set(AUTH)
      .send({ slug: '  876-couriers-pro  ' })

    expect(response.status).toBe(200)
    const data = product.update.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >
    expect(data.slug).toBe('876-couriers-pro')
  })

  it('refuses a slug already held by another product', async () => {
    stubProductLookup({ bySlug: productRow({ id: 'prd_other' }) })

    const response = await request(createApp())
      .patch('/products/prd_9tQ6')
      .set(AUTH)
      .send({ slug: 'taken' })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('product/duplicate-slug')
  })

  it('allows a product to keep its own slug', async () => {
    stubProductLookup({ bySlug: productRow() })

    const response = await request(createApp())
      .patch('/products/prd_9tQ6')
      .set(AUTH)
      .send({ slug: '876-couriers-pro' })

    expect(response.status).toBe(200)
  })

  it('archives through active:false, stamping both columns', async () => {
    await request(createApp())
      .patch('/products/prd_9tQ6')
      .set(AUTH)
      .send({ active: false })

    const data = product.update.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >
    expect(data.active).toBe(false)
    expect(data.status).toBe('archived')
    expect(data.archivedAt).toBe(BigInt(NOW))
  })

  it('clears the archive stamp through active:true', async () => {
    await request(createApp())
      .patch('/products/prd_9tQ6')
      .set(AUTH)
      .send({ active: true })

    const data = product.update.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >
    expect(data.status).toBe('active')
    expect(data.archivedAt).toBeNull()
  })

  it('404s an unknown tax code', async () => {
    taxCode.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .patch('/products/prd_9tQ6')
      .set(AUTH)
      .send({ tax_code_id: 'txcd_gone' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('tax_code/not-found')
  })

  it('clears the tax code when sent as null', async () => {
    await request(createApp())
      .patch('/products/prd_9tQ6')
      .set(AUTH)
      .send({ tax_code_id: null })

    const data = product.update.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >
    expect(data.taxCodeId).toBeNull()
    expect(taxCode.findUnique).not.toHaveBeenCalled()
  })

  it('404s an unknown product', async () => {
    stubProductLookup({ byId: null })

    const response = await request(createApp())
      .patch('/products/prd_gone')
      .set(AUTH)
      .send({ name: 'Pro Plus' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('product/not-found')
    expect(product.update).not.toHaveBeenCalled()
  })

  it('rejects a null name rather than failing the NOT NULL column', async () => {
    const response = await request(createApp())
      .patch('/products/prd_9tQ6')
      .set(AUTH)
      .send({ name: null })

    expect(response.status).toBe(422)
    expect(product.update).not.toHaveBeenCalled()
  })

  it('is admin-only', async () => {
    const response = await request(createApp())
      .patch('/products/prd_9tQ6')
      .set(KEY_ONLY)
      .send({ name: 'Pro Plus' })

    expect(response.status).toBe(401)
  })
})

describe('DELETE /products/:product_id', () => {
  it('archives rather than deleting, and returns a tombstone', async () => {
    // A subscription item's price carries ON DELETE RESTRICT, so removing the
    // row would fail on any product still being paid for.
    const response = await request(createApp())
      .delete('/products/prd_9tQ6')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { object: 'product', id: 'prd_9tQ6', deleted: true },
      error: null,
    })
    expect(product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'archived', updatedAt: BigInt(NOW) },
      })
    )
  })

  it('404s an unknown product', async () => {
    stubProductLookup({ byId: null })

    const response = await request(createApp())
      .delete('/products/prd_gone')
      .set(AUTH)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('product/not-found')
    expect(product.update).not.toHaveBeenCalled()
  })

  it('is admin-only', async () => {
    const response = await request(createApp())
      .delete('/products/prd_9tQ6')
      .set(KEY_ONLY)

    expect(response.status).toBe(401)
  })
})

describe('POST /products/:product_id/prices', () => {
  it('adds a price to an existing product', async () => {
    const response = await request(createApp())
      .post('/products/prd_9tQ6/prices')
      .set(AUTH)
      .send({ unit_amount: 150000, billing_interval: 'year', name: 'Annual' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: SERIALIZED_PRICE, error: null })

    const data = price.create.mock.calls[0]?.[0].data as Record<string, unknown>
    expect(data.productId).toBe('prd_9tQ6')
    expect(data.billingInterval).toBe('year')
    expect(data.status).toBe('active')
  })

  it('defaults the currency', async () => {
    await request(createApp())
      .post('/products/prd_9tQ6/prices')
      .set(AUTH)
      .send({ unit_amount: 150000 })

    const data = price.create.mock.calls[0]?.[0].data as Record<string, unknown>
    expect(data.currency).toBe('jmd')
  })

  it('404s an unknown product', async () => {
    stubProductLookup({ byId: null })

    const response = await request(createApp())
      .post('/products/prd_gone/prices')
      .set(AUTH)
      .send({ unit_amount: 150000 })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('product/not-found')
    expect(price.create).not.toHaveBeenCalled()
  })

  it('rejects an unrecognised billing interval', async () => {
    const response = await request(createApp())
      .post('/products/prd_9tQ6/prices')
      .set(AUTH)
      .send({ unit_amount: 150000, billing_interval: 'fortnight' })

    expect(response.status).toBe(422)
    expect(price.create).not.toHaveBeenCalled()
  })

  it('is admin-only', async () => {
    const response = await request(createApp())
      .post('/products/prd_9tQ6/prices')
      .set(KEY_ONLY)
      .send({ unit_amount: 150000 })

    expect(response.status).toBe(401)
  })
})

describe('GET /products/:product_id/prices/:price_id', () => {
  it('returns the price', async () => {
    const response = await request(createApp())
      .get('/products/prd_9tQ6/prices/prc_4kW2')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: SERIALIZED_PRICE, error: null })
  })

  it('404s a price belonging to another product', async () => {
    // The caller is not entitled to learn that the id resolves elsewhere.
    price.findUnique.mockResolvedValue(priceRow({ productId: 'prd_other' }))

    const response = await request(createApp())
      .get('/products/prd_9tQ6/prices/prc_4kW2')
      .set(AUTH)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('price/not-found')
  })

  it('404s an unknown price', async () => {
    price.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/products/prd_9tQ6/prices/prc_gone')
      .set(AUTH)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('price/not-found')
  })
})

describe('PATCH /products/:product_id/prices/:price_id', () => {
  it('applies the fields that were sent', async () => {
    const response = await request(createApp())
      .patch('/products/prd_9tQ6/prices/prc_4kW2')
      .set(AUTH)
      .send({ nickname: 'Legacy annual', active: false })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: SERIALIZED_PRICE, error: null })

    const data = price.update.mock.calls[0]?.[0].data as Record<string, unknown>
    expect(data.nickname).toBe('Legacy annual')
    expect(data.active).toBe(false)
    expect(data.updatedAt).toBe(BigInt(NOW))
    expect(data).not.toHaveProperty('name')
  })

  it('rejects an empty body', async () => {
    const response = await request(createApp())
      .patch('/products/prd_9tQ6/prices/prc_4kW2')
      .set(AUTH)
      .send({})

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('price/no-updates')
    expect(price.update).not.toHaveBeenCalled()
  })

  it('404s a price belonging to another product', async () => {
    price.findUnique.mockResolvedValue(priceRow({ productId: 'prd_other' }))

    const response = await request(createApp())
      .patch('/products/prd_9tQ6/prices/prc_4kW2')
      .set(AUTH)
      .send({ nickname: 'Legacy annual' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('price/not-found')
    expect(price.update).not.toHaveBeenCalled()
  })

  it('is admin-only', async () => {
    const response = await request(createApp())
      .patch('/products/prd_9tQ6/prices/prc_4kW2')
      .set(KEY_ONLY)
      .send({ nickname: 'Legacy annual' })

    expect(response.status).toBe(401)
  })
})

describe('DELETE /products/:product_id/prices/:price_id', () => {
  it('archives the price, clearing both the flag and the status', async () => {
    const response = await request(createApp())
      .delete('/products/prd_9tQ6/prices/prc_4kW2')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: SERIALIZED_PRICE, error: null })
    expect(price.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { active: false, status: 'archived', updatedAt: BigInt(NOW) },
      })
    )
  })

  it('404s a price belonging to another product', async () => {
    price.findUnique.mockResolvedValue(priceRow({ productId: 'prd_other' }))

    const response = await request(createApp())
      .delete('/products/prd_9tQ6/prices/prc_4kW2')
      .set(AUTH)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('price/not-found')
    expect(price.update).not.toHaveBeenCalled()
  })

  it('is admin-only', async () => {
    const response = await request(createApp())
      .delete('/products/prd_9tQ6/prices/prc_4kW2')
      .set(KEY_ONLY)

    expect(response.status).toBe(401)
  })
})
