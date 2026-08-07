import { listObject, type ListObject } from '@/http/envelope'
import { AppHttpError } from '@/http/errors'
import { generateId } from '@/platform/ids'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'

import * as repository from './products.repository'
import type {
  CreateProductBody,
  ListProductsQuery,
  Price,
  PriceCreateBody,
  Product,
  UpdatePriceBody,
  UpdateProductBody,
} from './products.schemas'
import { serializePrice, serializeProduct } from './products.serializers'
import type { ProductRow } from './products.serializers'

/** The subscribable product catalog. */

const log = getLogger('products')

const productNotFound = () =>
  new AppHttpError({
    code: 'product/not-found',
    message: 'No product exists with the provided identifier.',
    httpStatus: 404,
  })

const priceNotFound = () =>
  new AppHttpError({
    code: 'price/not-found',
    message: 'No price exists with the provided identifier on this product.',
    httpStatus: 404,
  })

async function requireProduct(productId: string): Promise<ProductRow> {
  const row = await repository.findById(productId)
  if (!row) throw productNotFound()

  return row
}

/**
 * A price is addressed through its product, so a price that exists on a
 * different product is a 404 rather than a 403 — the caller is not entitled to
 * learn that the id resolves elsewhere.
 */
async function requirePrice(productId: string, priceId: string) {
  const row = await repository.findPriceById(priceId)
  if (!row || row.productId !== productId) throw priceNotFound()

  return row
}

/**
 * Every module a plan sells must be an active module of the plan's own app.
 *
 * A plan-wide entitlement to a module from another app would grant access the
 * subscribing organization never bought, so the app match is checked rather
 * than assumed from the caller having both ids.
 */
async function validateProductModules(
  appId: string | null,
  moduleIds: string[]
): Promise<string[]> {
  const uniqueIds = [...new Set(moduleIds)]
  if (uniqueIds.length === 0) return []

  if (appId === null)
    throw new AppHttpError({
      code: 'plan-module/missing-app',
      message: 'A plan must belong to an app before modules can be included.',
      httpStatus: 422,
    })

  const modules = await repository.findModules(uniqueIds)
  if (modules.length !== uniqueIds.length)
    throw new AppHttpError({
      code: 'plan-module/not-found',
      message: 'One or more selected application modules do not exist.',
      httpStatus: 422,
    })

  if (modules.some((row) => row.appId !== appId || row.status !== 'active'))
    throw new AppHttpError({
      code: 'plan-module/app-mismatch',
      message:
        'Every selected active module must belong to the same app as the plan.',
      httpStatus: 422,
    })

  return uniqueIds
}

export async function listProducts(
  query: ListProductsQuery
): Promise<ListObject<Product>> {
  const rows = await repository.list({
    ...(query.appId !== undefined ? { appId: query.appId } : {}),
    ...(query.status !== undefined ? { status: query.status } : {}),
  })

  return listObject({
    data: rows.map(serializeProduct),
    hasMore: false,
    url: '/products',
  })
}

export async function retrieveProduct(productId: string): Promise<Product> {
  return serializeProduct(await requireProduct(productId))
}

/**
 * The initial price is created from `body.price`, but only the fields the
 * FastAPI service persists: `recurring`, `lookup_key`, `metadata`, and `type`
 * are accepted on the request and left to their column defaults.
 */
export async function createProduct(body: CreateProductBody): Promise<Product> {
  if (await repository.findBySlug(body.slug))
    throw new AppHttpError({
      code: 'product/duplicate-slug',
      message: 'A product with this slug already exists.',
      httpStatus: 409,
    })

  const appId = body.app_id ?? null
  if (appId !== null) {
    const app = await repository.findApp(appId)
    if (!app)
      throw new AppHttpError({
        code: 'app/not-found',
        message: 'App not found.',
        httpStatus: 404,
      })

    // Only a product app can be sold: an internal or third-party app has no
    // subscription an organization could hold.
    if (app.appKind !== 'product')
      throw new AppHttpError({
        code: 'product/app-kind-invalid',
        message: 'Products can only be scoped to product apps.',
        httpStatus: 422,
      })
  }

  const taxCodeId = body.tax_code_id ?? null
  if (taxCodeId && !(await repository.taxCodeExists(taxCodeId)))
    throw new AppHttpError({
      code: 'tax_code/not-found',
      message: 'Tax code not found.',
      httpStatus: 404,
    })

  const moduleIds = await validateProductModules(appId, body.module_ids)

  const now = BigInt(nowUnixSeconds())
  const productId = generateId('product')

  await repository.create({
    id: productId,
    slug: body.slug,
    name: body.name,
    description: body.description ?? null,
    appId,
    lookupKey: body.lookup_key ?? null,
    taxCodeId,
    metadata: body.metadata ?? null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })

  await repository.createPrice({
    id: generateId('price'),
    productId,
    unitAmount: body.price.unit_amount ?? null,
    currency: body.price.currency,
    billingInterval: body.price.billing_interval ?? null,
    intervalCount: body.price.interval_count ?? null,
    name: body.price.name ?? null,
    nickname: body.price.nickname ?? null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })

  if (moduleIds.length > 0)
    await repository.replaceModules(productId, moduleIds, now, () =>
      generateId('planModule')
    )

  // Re-read rather than compose the response: the price and the plan modules
  // were written after the product row, and both are part of the resource.
  const row = await requireProduct(productId)
  log.info(
    { product_id: row.id, slug: row.slug, app_id: row.appId },
    'products.create'
  )

  return serializeProduct(row)
}

export async function replaceProductModules(
  productId: string,
  moduleIds: string[]
): Promise<Product> {
  const product = await requireProduct(productId)
  const validated = await validateProductModules(product.appId, moduleIds)

  const now = BigInt(nowUnixSeconds())
  await repository.replaceModules(productId, validated, now, () =>
    generateId('planModule')
  )

  const row = await requireProduct(productId)
  log.info(
    { product_id: productId, module_count: validated.length },
    'products.modules.replace'
  )

  return serializeProduct(row)
}

/**
 * `provided` carries which keys the caller actually sent, so clearing a field
 * and leaving it alone stay distinguishable — the FastAPI handler reads the
 * same thing from Pydantic's `exclude_unset`.
 */
export async function updateProduct(
  productId: string,
  body: UpdateProductBody,
  provided: Set<string>
): Promise<Product> {
  if (provided.size === 0)
    throw new AppHttpError({
      code: 'product/no-updates',
      message: 'Provide at least one field to update.',
      httpStatus: 422,
    })

  const now = BigInt(nowUnixSeconds())
  const data: repository.ProductUpdateData = { updatedAt: now }

  if (provided.has('slug')) {
    const slug = (body.slug ?? '').trim()
    if (!slug)
      throw new AppHttpError({
        code: 'product/invalid-slug',
        message: 'Plan slug cannot be empty.',
        httpStatus: 422,
      })

    const existing = await repository.findBySlug(slug)
    if (existing && existing.id !== productId)
      throw new AppHttpError({
        code: 'product/duplicate-slug',
        message: 'A product with this slug already exists.',
        httpStatus: 409,
      })

    data.slug = slug
  }

  if (provided.has('tax_code_id')) {
    if (body.tax_code_id && !(await repository.taxCodeExists(body.tax_code_id)))
      throw new AppHttpError({
        code: 'tax_code/not-found',
        message: 'Tax code not found.',
        httpStatus: 404,
      })

    data.taxCodeId = body.tax_code_id ?? null
  }

  if (body.name !== undefined) data.name = body.name
  if (provided.has('description')) data.description = body.description ?? null
  if (provided.has('metadata')) data.metadata = body.metadata ?? null

  // `active` drives both columns: the boolean the Stripe-shaped surface reads
  // and the legacy status string the rest of the platform still filters on.
  if (body.active !== undefined) {
    data.active = body.active
    data.status = body.active ? 'active' : 'archived'
    data.archivedAt = body.active ? null : now
  }

  const row = await repository.update(productId, data)
  if (!row) throw productNotFound()

  log.info(
    { product_id: productId, fields: [...provided].sort() },
    'products.update'
  )

  return serializeProduct(row)
}

/**
 * Archive rather than delete: a price carries `ON DELETE RESTRICT` from every
 * subscription item, so removing the row would fail on any product an
 * organization is still subscribed to.
 */
export async function archiveProduct(
  productId: string
): Promise<{ object: 'product'; id: string; deleted: true }> {
  await requireProduct(productId)
  await repository.update(productId, {
    status: 'archived',
    updatedAt: BigInt(nowUnixSeconds()),
  })

  log.info({ product_id: productId }, 'products.archive')

  return { object: 'product', id: productId, deleted: true }
}

export async function createPrice(
  productId: string,
  body: PriceCreateBody
): Promise<Price> {
  await requireProduct(productId)

  const now = BigInt(nowUnixSeconds())
  const row = await repository.createPrice({
    id: generateId('price'),
    productId,
    unitAmount: body.unit_amount ?? null,
    currency: body.currency,
    billingInterval: body.billing_interval ?? null,
    intervalCount: body.interval_count ?? null,
    name: body.name ?? null,
    nickname: body.nickname ?? null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })

  log.info(
    { product_id: productId, price_id: row.id },
    'products.prices.create'
  )

  return serializePrice(row)
}

export async function retrievePrice(
  productId: string,
  priceId: string
): Promise<Price> {
  return serializePrice(await requirePrice(productId, priceId))
}

export async function updatePrice(
  productId: string,
  priceId: string,
  body: UpdatePriceBody,
  provided: Set<string>
): Promise<Price> {
  await requirePrice(productId, priceId)

  if (provided.size === 0)
    throw new AppHttpError({
      code: 'price/no-updates',
      message: 'Provide at least one field to update.',
      httpStatus: 422,
    })

  const data: repository.PriceUpdateData = {
    updatedAt: BigInt(nowUnixSeconds()),
  }
  if (provided.has('name')) data.name = body.name ?? null
  if (provided.has('nickname')) data.nickname = body.nickname ?? null
  if (body.active !== undefined) data.active = body.active
  if (provided.has('metadata')) data.metadata = body.metadata ?? null

  const row = await repository.updatePrice(priceId, data)
  log.info(
    { product_id: productId, price_id: priceId, fields: [...provided].sort() },
    'products.prices.update'
  )

  return serializePrice(row)
}

export async function archivePrice(
  productId: string,
  priceId: string
): Promise<Price> {
  await requirePrice(productId, priceId)

  const row = await repository.updatePrice(priceId, {
    active: false,
    status: 'archived',
    updatedAt: BigInt(nowUnixSeconds()),
  })

  log.info(
    { product_id: productId, price_id: priceId },
    'products.prices.archive'
  )

  return serializePrice(row)
}
