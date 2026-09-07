import type { Request, Response } from 'express'
import { z, type ZodType } from 'zod'

import {
  createApiRouter,
  type BillingSecurity,
  type GuardResolver,
} from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'

import { catalogController as controller } from './catalog.controller'
import { itemStockController } from './item-stock.controller'
import { itemVariantsController } from './item-variants.controller'
import {
  activeQuerySchema,
  AddonAssociationMutationSchema,
  AddonCloneSchema,
  AddonCreateSchema,
  AddonUpdateSchema,
  associationBatchSchema,
  deletedSchema,
  idParams,
  integrationItemCreateSchema,
  ItemCreateSchema,
  ItemMediaAttachSchema,
  ItemMediaReorderSchema,
  itemPreferencesSchema,
  ItemPreferencesUpdateSchema,
  ItemStockAdjustmentSchema,
  ItemUpdateSchema,
  ItemVariantGenerateSchema,
  ItemVariantUpdateSchema,
  listSchema,
  organizationIdParams,
  organizationResourceParams,
  PlanCloneSchema,
  PlanCreateSchema,
  planQuerySchema,
  PlanUpdateSchema,
  PriceCreateSchema,
  PriceEnsureSchema,
  priceQuerySchema,
  PriceListCreateSchema,
  PriceListResolveSchema,
  PriceListUpdateSchema,
  PriceUpdateSchema,
  ProductCreateSchema,
  ProductEnsureSchema,
  ProductUpdateSchema,
  resourceSchema,
  resolutionSchema,
  PlanEnsureSchema,
} from './catalog.schemas'

type Handler = (req: Request, res: Response) => unknown | Promise<unknown>
const clientErrors = {
  '4XX': { description: 'Client Error', schema: errorEnvelopeSchema },
}
const legacyErrors = {
  422: { description: 'Validation Error', schema: errorEnvelopeSchema },
}

function registerCrud(
  api: ReturnType<typeof createApiRouter>,
  options: {
    name: string
    object: string
    path: string
    idName: string
    securityRead: BillingSecurity
    securityWrite: BillingSecurity
    query: z.ZodObject
    create: ZodType
    update: ZodType
    handlers: {
      list: Handler
      get: Handler
      create: Handler
      update: Handler
      del: Handler
    }
    operationIds?: Partial<
      Record<'list' | 'get' | 'create' | 'update' | 'del', string>
    >
    createStatus?: 200 | 201
    legacyContract?: boolean
  }
) {
  const resource = resourceSchema(options.object)
  const params = idParams(options.idName)
  const detail = `${options.path}/:${options.idName}`
  const documentedErrors = options.legacyContract ? legacyErrors : clientErrors
  api.get({
    path: options.path,
    summary: `List ${options.name}`,
    ...(options.operationIds?.list
      ? { operationId: options.operationIds.list }
      : {}),
    security: options.securityRead,
    request: { query: options.query },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listSchema(options.object)),
      },
      ...documentedErrors,
    },
    handler: options.handlers.list,
  })
  api.post({
    path: options.path,
    summary: `Create ${options.name}`,
    ...(options.operationIds?.create
      ? { operationId: options.operationIds.create }
      : {}),
    security: options.securityWrite,
    request: { body: options.create },
    documentBody: options.legacyContract ? false : undefined,
    responses: {
      [options.createStatus ?? 201]: {
        description:
          options.createStatus === 200 ? 'Successful Response' : 'Created',
        schema: successEnvelopeSchema(resource),
      },
      ...documentedErrors,
    },
    handler: options.handlers.create,
  })
  api.get({
    path: detail,
    summary: `Retrieve ${options.name}`,
    ...(options.operationIds?.get
      ? { operationId: options.operationIds.get }
      : {}),
    security: options.securityRead,
    request: { params },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resource),
      },
      ...documentedErrors,
    },
    handler: options.handlers.get,
  })
  api.patch({
    path: detail,
    summary: `Update ${options.name}`,
    ...(options.operationIds?.update
      ? { operationId: options.operationIds.update }
      : {}),
    security: options.securityWrite,
    request: { params, body: options.update },
    documentBody: options.legacyContract ? false : undefined,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resource),
      },
      ...documentedErrors,
    },
    handler: options.handlers.update,
  })
  api.delete({
    path: detail,
    summary: `Delete ${options.name}`,
    ...(options.operationIds?.del
      ? { operationId: options.operationIds.del }
      : {}),
    security: options.securityWrite,
    request: { params },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(deletedSchema(options.object)),
      },
      ...documentedErrors,
    },
    handler: options.handlers.del,
  })
}

export function createCatalogRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Catalog', resolveGuards })
  const read: BillingSecurity = { kind: 'tenant', permission: 'catalog:read' }
  const write: BillingSecurity = { kind: 'tenant', permission: 'catalog:write' }
  const itemVariantParams = z.strictObject({
    itemId: z.string().min(1),
    variantId: z.string().min(1),
  })
  const itemMediaParams = z.strictObject({
    itemId: z.string().min(1),
    fileId: z.string().min(1),
  })
  const variantMediaParams = itemVariantParams.extend({
    fileId: z.string().min(1),
  })

  registerCrud(api, {
    name: 'products',
    object: 'product',
    path: '/products',
    idName: 'productId',
    securityRead: read,
    securityWrite: write,
    query: activeQuerySchema,
    create: ProductCreateSchema,
    update: ProductUpdateSchema,
    handlers: {
      list: controller.productsList,
      get: controller.productsGet,
      create: controller.productsCreate,
      update: controller.productsUpdate,
      del: controller.productsDelete,
    },
  })
  registerCrud(api, {
    name: 'plans',
    object: 'plan',
    path: '/plans',
    idName: 'planId',
    securityRead: read,
    securityWrite: write,
    query: planQuerySchema,
    create: PlanCreateSchema,
    update: PlanUpdateSchema,
    handlers: {
      list: controller.plansList,
      get: controller.plansGet,
      create: controller.plansCreate,
      update: controller.plansUpdate,
      del: controller.plansDelete,
    },
  })
  registerCrud(api, {
    name: 'prices',
    object: 'price',
    path: '/prices',
    idName: 'priceId',
    securityRead: read,
    securityWrite: write,
    query: priceQuerySchema,
    create: PriceCreateSchema,
    update: PriceUpdateSchema,
    handlers: {
      list: controller.pricesList,
      get: controller.pricesGet,
      create: controller.pricesCreate,
      update: controller.pricesUpdate,
      del: controller.pricesDelete,
    },
  })
  registerCrud(api, {
    name: 'add-ons',
    object: 'addon',
    path: '/addons',
    idName: 'addonId',
    securityRead: read,
    securityWrite: write,
    query: planQuerySchema,
    create: AddonCreateSchema,
    update: AddonUpdateSchema,
    handlers: {
      list: controller.addonsList,
      get: controller.addonsGet,
      create: controller.addonsCreate,
      update: controller.addonsUpdate,
      del: controller.addonsDelete,
    },
  })
  registerCrud(api, {
    name: 'items',
    object: 'item',
    path: '/items',
    idName: 'itemId',
    securityRead: read,
    securityWrite: write,
    query: activeQuerySchema,
    create: ItemCreateSchema,
    update: ItemUpdateSchema,
    handlers: {
      list: controller.itemsList,
      get: controller.itemsGet,
      create: controller.itemsCreate,
      update: controller.itemsUpdate,
      del: controller.itemsDelete,
    },
    operationIds: {
      list: 'billing-billing_get_items',
      create: 'billing-billing_post_items',
      get: 'billing-billing_get_items_itemId',
      update: 'billing-billing_patch_items_itemId',
      del: 'billing-billing_delete_items_itemId',
    },
    createStatus: 200,
    legacyContract: true,
  })
  registerCrud(api, {
    name: 'price lists',
    object: 'price_list',
    path: '/price-lists',
    idName: 'priceListId',
    securityRead: read,
    securityWrite: write,
    query: activeQuerySchema,
    create: PriceListCreateSchema,
    update: PriceListUpdateSchema,
    handlers: {
      list: controller.priceListsList,
      get: controller.priceListsGet,
      create: controller.priceListsCreate,
      update: controller.priceListsUpdate,
      del: controller.priceListsDelete,
    },
  })

  api.get({
    path: '/item-preferences',
    summary: 'Retrieve item preferences',
    security: read,
    responses: {
      200: {
        description: 'Item preferences returned',
        schema: successEnvelopeSchema(itemPreferencesSchema),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.preferencesGet,
  })
  api.patch({
    path: '/item-preferences',
    summary: 'Update item preferences',
    security: write,
    request: { body: ItemPreferencesUpdateSchema },
    responses: {
      200: {
        description: 'Item preferences updated',
        schema: successEnvelopeSchema(itemPreferencesSchema),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.preferencesUpdate,
  })
  api.get({
    path: '/item-variants',
    summary: 'Search item variants',
    security: read,
    request: { query: activeQuerySchema },
    responses: {
      200: {
        description: 'Variant list',
        schema: successEnvelopeSchema(listSchema('item_variant')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.search,
  })
  api.get({
    path: '/items/:itemId/variants',
    summary: 'List item variants',
    security: read,
    request: { params: idParams('itemId'), query: activeQuerySchema },
    responses: {
      200: {
        description: 'Variant list',
        schema: successEnvelopeSchema(listSchema('item_variant')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.list,
  })
  api.post({
    path: '/items/:itemId/variants/generate',
    summary: 'Generate item variants',
    security: write,
    request: { params: idParams('itemId'), body: ItemVariantGenerateSchema },
    responses: {
      200: {
        description: 'Item converted to variants',
        schema: successEnvelopeSchema(resourceSchema('item')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.generate,
  })
  api.get({
    path: '/items/:itemId/variants/:variantId',
    summary: 'Retrieve item variant',
    security: read,
    request: { params: itemVariantParams },
    responses: {
      200: {
        description: 'Variant returned',
        schema: successEnvelopeSchema(resourceSchema('item_variant')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.get,
  })
  api.patch({
    path: '/items/:itemId/variants/:variantId',
    summary: 'Update item variant',
    security: write,
    request: { params: itemVariantParams, body: ItemVariantUpdateSchema },
    responses: {
      200: {
        description: 'Variant updated',
        schema: successEnvelopeSchema(resourceSchema('item_variant')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.update,
  })
  api.post({
    path: '/items/:itemId/variants/:variantId/stock-adjustments',
    summary: 'Adjust item variant stock',
    security: write,
    request: { params: itemVariantParams, body: ItemStockAdjustmentSchema },
    responses: {
      200: {
        description: 'Variant stock adjusted',
        schema: successEnvelopeSchema(resourceSchema('item_variant')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.adjustStock,
  })

  api.get({
    path: '/items/:itemId/media',
    summary: 'List item media',
    security: read,
    request: { params: idParams('itemId') },
    responses: {
      200: {
        description: 'Item media list',
        schema: successEnvelopeSchema(listSchema('item_media')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.mediaList,
  })
  api.post({
    path: '/items/:itemId/media',
    summary: 'Attach item media',
    security: write,
    request: { params: idParams('itemId'), body: ItemMediaAttachSchema },
    responses: {
      200: {
        description: 'Item media attached',
        schema: successEnvelopeSchema(listSchema('item_media')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.mediaAttach,
  })
  api.put({
    path: '/items/:itemId/media',
    summary: 'Reorder item media',
    security: write,
    request: { params: idParams('itemId'), body: ItemMediaReorderSchema },
    responses: {
      200: {
        description: 'Item media reordered',
        schema: successEnvelopeSchema(listSchema('item_media')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.mediaReorder,
  })
  api.delete({
    path: '/items/:itemId/media/:fileId',
    summary: 'Detach item media',
    security: write,
    request: { params: itemMediaParams },
    responses: {
      200: {
        description: 'Item media detached',
        schema: successEnvelopeSchema(deletedSchema('item_media')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.mediaRemove,
  })
  api.get({
    path: '/items/:itemId/variants/:variantId/media',
    summary: 'List item variant media',
    security: read,
    request: { params: itemVariantParams },
    responses: {
      200: {
        description: 'Variant media list',
        schema: successEnvelopeSchema(listSchema('item_media')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.variantMediaList,
  })
  api.post({
    path: '/items/:itemId/variants/:variantId/media',
    summary: 'Attach item variant media',
    security: write,
    request: { params: itemVariantParams, body: ItemMediaAttachSchema },
    responses: {
      200: {
        description: 'Variant media attached',
        schema: successEnvelopeSchema(listSchema('item_media')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.variantMediaAttach,
  })
  api.put({
    path: '/items/:itemId/variants/:variantId/media',
    summary: 'Reorder item variant media',
    security: write,
    request: { params: itemVariantParams, body: ItemMediaReorderSchema },
    responses: {
      200: {
        description: 'Variant media reordered',
        schema: successEnvelopeSchema(listSchema('item_media')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.variantMediaReorder,
  })
  api.delete({
    path: '/items/:itemId/variants/:variantId/media/:fileId',
    summary: 'Detach item variant media',
    security: write,
    request: { params: variantMediaParams },
    responses: {
      200: {
        description: 'Variant media detached',
        schema: successEnvelopeSchema(deletedSchema('item_media')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.variantMediaRemove,
  })

  api.post({
    path: '/items/:itemId/stock-adjustments',
    summary: 'Adjust item stock',
    security: write,
    request: {
      params: idParams('itemId'),
      body: ItemStockAdjustmentSchema,
    },
    responses: {
      200: {
        description: 'Item stock adjusted',
        schema: successEnvelopeSchema(resourceSchema('item')),
      },
      ...clientErrors,
    },
    handler: itemStockController.adjust,
  })
  api.post({
    path: '/plans/:planId/clone',
    summary: 'Clone a plan',
    security: write,
    request: { params: idParams('planId'), body: PlanCloneSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resourceSchema('plan')),
      },
      ...clientErrors,
    },
    handler: controller.plansClone,
  })
  api.post({
    path: '/addons/:addonId/clone',
    summary: 'Clone an add-on',
    security: write,
    request: { params: idParams('addonId'), body: AddonCloneSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resourceSchema('addon')),
      },
      ...clientErrors,
    },
    handler: controller.addonsClone,
  })
  api.put({
    path: '/addons/:addonId/associations',
    summary: 'Save add-on plan associations',
    security: write,
    request: {
      params: idParams('addonId'),
      body: AddonAssociationMutationSchema,
    },
    responses: {
      200: {
        description: 'Saved',
        schema: successEnvelopeSchema(associationBatchSchema),
      },
      ...clientErrors,
    },
    handler: controller.addonsAssociations,
  })
  api.post({
    path: '/price-lists/:priceListId/resolve',
    summary: 'Resolve a price-list amount',
    security: read,
    request: { params: idParams('priceListId'), body: PriceListResolveSchema },
    responses: {
      200: {
        description: 'Resolved',
        schema: successEnvelopeSchema(resolutionSchema),
      },
      ...clientErrors,
    },
    handler: controller.priceListsResolve,
  })

  api.post({
    path: '/admin/products/ensure',
    summary: 'Ensure a mirrored product',
    security: { kind: 'admin' },
    request: { body: ProductEnsureSchema },
    responses: {
      200: {
        description: 'Product ensured',
        schema: successEnvelopeSchema(resourceSchema('product')),
      },
      ...clientErrors,
    },
    handler: controller.productsEnsure,
  })
  api.post({
    path: '/admin/plans/ensure',
    summary: 'Ensure a mirrored plan',
    security: { kind: 'admin' },
    request: { body: PlanEnsureSchema },
    responses: {
      200: {
        description: 'Plan ensured',
        schema: successEnvelopeSchema(resourceSchema('plan')),
      },
      ...clientErrors,
    },
    handler: controller.plansEnsure,
  })
  api.post({
    path: '/admin/prices/ensure',
    summary: 'Ensure a mirrored price',
    security: { kind: 'admin' },
    request: { body: PriceEnsureSchema },
    responses: {
      200: {
        description: 'Price ensured',
        schema: successEnvelopeSchema(resourceSchema('price')),
      },
      ...clientErrors,
    },
    handler: controller.pricesEnsure,
  })

  const itemBase = '/integrations/organizations/:organizationId/items'
  const integrationRead: BillingSecurity = {
    kind: 'integration',
    scope: 'billing.items.read',
  }
  const integrationWrite: BillingSecurity = {
    kind: 'integration',
    scope: 'billing.items.write',
  }
  const integrationItemVariantParams = organizationResourceParams('itemId').extend({
    variantId: z.string().min(1),
  })
  const integrationItemMediaParams = organizationResourceParams('itemId').extend({
    fileId: z.string().min(1),
  })
  const integrationVariantMediaParams = integrationItemVariantParams.extend({
    fileId: z.string().min(1),
  })

  api.get({
    path: '/integrations/organizations/:organizationId/item-preferences',
    summary: 'Retrieve organization item preferences',
    security: integrationRead,
    request: { params: organizationIdParams },
    responses: {
      200: {
        description: 'Item preferences returned',
        schema: successEnvelopeSchema(itemPreferencesSchema),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.preferencesGet,
  })
  api.patch({
    path: '/integrations/organizations/:organizationId/item-preferences',
    summary: 'Update organization item preferences',
    security: integrationWrite,
    request: { params: organizationIdParams, body: ItemPreferencesUpdateSchema },
    responses: {
      200: {
        description: 'Item preferences updated',
        schema: successEnvelopeSchema(itemPreferencesSchema),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.preferencesUpdate,
  })
  api.get({
    path: '/integrations/organizations/:organizationId/item-variants',
    summary: 'Search organization Billing item variants',
    security: integrationRead,
    request: { params: organizationIdParams, query: activeQuerySchema },
    responses: {
      200: {
        description: 'Variant list',
        schema: successEnvelopeSchema(listSchema('item_variant')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.integrationSearch,
  })

  api.get({
    path: itemBase,
    summary: 'List organization Billing items',
    security: integrationRead,
    request: { params: organizationIdParams, query: activeQuerySchema },
    responses: {
      200: {
        description: 'Item list',
        schema: successEnvelopeSchema(listSchema('item')),
      },
      ...clientErrors,
    },
    handler: controller.integrationItemsList,
  })
  api.post({
    path: itemBase,
    summary: 'Create an organization Billing item',
    security: integrationWrite,
    request: {
      params: organizationIdParams,
      body: integrationItemCreateSchema,
    },
    responses: {
      200: {
        description: 'Item replayed',
        schema: successEnvelopeSchema(resourceSchema('item')),
      },
      201: {
        description: 'Item created',
        schema: successEnvelopeSchema(resourceSchema('item')),
      },
      ...clientErrors,
    },
    handler: controller.integrationItemsCreate,
  })
  api.get({
    path: `${itemBase}/:itemId`,
    summary: 'Retrieve an organization Billing item',
    security: integrationRead,
    request: { params: organizationResourceParams('itemId') },
    responses: {
      200: {
        description: 'Item returned',
        schema: successEnvelopeSchema(resourceSchema('item')),
      },
      ...clientErrors,
    },
    handler: controller.integrationItemsGet,
  })
  api.patch({
    path: `${itemBase}/:itemId`,
    summary: 'Update an organization Billing item',
    security: integrationWrite,
    request: {
      params: organizationResourceParams('itemId'),
      body: ItemUpdateSchema,
    },
    responses: {
      200: {
        description: 'Item updated',
        schema: successEnvelopeSchema(resourceSchema('item')),
      },
      ...clientErrors,
    },
    handler: controller.integrationItemsUpdate,
  })
  api.get({
    path: `${itemBase}/:itemId/variants`,
    summary: 'List organization Billing item variants',
    security: integrationRead,
    request: {
      params: organizationResourceParams('itemId'),
      query: activeQuerySchema,
    },
    responses: {
      200: {
        description: 'Variant list',
        schema: successEnvelopeSchema(listSchema('item_variant')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.integrationList,
  })
  api.post({
    path: `${itemBase}/:itemId/variants/generate`,
    summary: 'Generate organization Billing item variants',
    security: integrationWrite,
    request: {
      params: organizationResourceParams('itemId'),
      body: ItemVariantGenerateSchema,
    },
    responses: {
      200: {
        description: 'Item converted to variants',
        schema: successEnvelopeSchema(resourceSchema('item')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.integrationGenerate,
  })
  api.get({
    path: `${itemBase}/:itemId/variants/:variantId`,
    summary: 'Retrieve organization Billing item variant',
    security: integrationRead,
    request: { params: integrationItemVariantParams },
    responses: {
      200: {
        description: 'Variant returned',
        schema: successEnvelopeSchema(resourceSchema('item_variant')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.integrationGet,
  })
  api.patch({
    path: `${itemBase}/:itemId/variants/:variantId`,
    summary: 'Update organization Billing item variant',
    security: integrationWrite,
    request: {
      params: integrationItemVariantParams,
      body: ItemVariantUpdateSchema,
    },
    responses: {
      200: {
        description: 'Variant updated',
        schema: successEnvelopeSchema(resourceSchema('item_variant')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.integrationUpdate,
  })
  api.post({
    path: `${itemBase}/:itemId/variants/:variantId/stock-adjustments`,
    summary: 'Adjust organization Billing item variant stock',
    security: integrationWrite,
    request: {
      params: integrationItemVariantParams,
      body: ItemStockAdjustmentSchema,
    },
    responses: {
      200: {
        description: 'Variant stock adjusted',
        schema: successEnvelopeSchema(resourceSchema('item_variant')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.integrationAdjustStock,
  })

  api.get({
    path: `${itemBase}/:itemId/media`,
    summary: 'List organization Billing item media',
    security: integrationRead,
    request: { params: organizationResourceParams('itemId') },
    responses: {
      200: {
        description: 'Item media list',
        schema: successEnvelopeSchema(listSchema('item_media')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.integrationMediaList,
  })
  api.post({
    path: `${itemBase}/:itemId/media`,
    summary: 'Attach organization Billing item media',
    security: integrationWrite,
    request: {
      params: organizationResourceParams('itemId'),
      body: ItemMediaAttachSchema,
    },
    responses: {
      200: {
        description: 'Item media attached',
        schema: successEnvelopeSchema(listSchema('item_media')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.integrationMediaAttach,
  })
  api.put({
    path: `${itemBase}/:itemId/media`,
    summary: 'Reorder organization Billing item media',
    security: integrationWrite,
    request: {
      params: organizationResourceParams('itemId'),
      body: ItemMediaReorderSchema,
    },
    responses: {
      200: {
        description: 'Item media reordered',
        schema: successEnvelopeSchema(listSchema('item_media')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.integrationMediaReorder,
  })
  api.delete({
    path: `${itemBase}/:itemId/media/:fileId`,
    summary: 'Detach organization Billing item media',
    security: integrationWrite,
    request: { params: integrationItemMediaParams },
    responses: {
      200: {
        description: 'Item media detached',
        schema: successEnvelopeSchema(deletedSchema('item_media')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.integrationMediaRemove,
  })
  api.get({
    path: `${itemBase}/:itemId/variants/:variantId/media`,
    summary: 'List organization Billing item variant media',
    security: integrationRead,
    request: { params: integrationItemVariantParams },
    responses: {
      200: {
        description: 'Variant media list',
        schema: successEnvelopeSchema(listSchema('item_media')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.integrationVariantMediaList,
  })
  api.post({
    path: `${itemBase}/:itemId/variants/:variantId/media`,
    summary: 'Attach organization Billing item variant media',
    security: integrationWrite,
    request: {
      params: integrationItemVariantParams,
      body: ItemMediaAttachSchema,
    },
    responses: {
      200: {
        description: 'Variant media attached',
        schema: successEnvelopeSchema(listSchema('item_media')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.integrationVariantMediaAttach,
  })
  api.put({
    path: `${itemBase}/:itemId/variants/:variantId/media`,
    summary: 'Reorder organization Billing item variant media',
    security: integrationWrite,
    request: {
      params: integrationItemVariantParams,
      body: ItemMediaReorderSchema,
    },
    responses: {
      200: {
        description: 'Variant media reordered',
        schema: successEnvelopeSchema(listSchema('item_media')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.integrationVariantMediaReorder,
  })
  api.delete({
    path: `${itemBase}/:itemId/variants/:variantId/media/:fileId`,
    summary: 'Detach organization Billing item variant media',
    security: integrationWrite,
    request: { params: integrationVariantMediaParams },
    responses: {
      200: {
        description: 'Variant media detached',
        schema: successEnvelopeSchema(deletedSchema('item_media')),
      },
      ...clientErrors,
    },
    handler: itemVariantsController.integrationVariantMediaRemove,
  })

  api.post({
    path: `${itemBase}/:itemId/stock-adjustments`,
    summary: 'Adjust organization Billing item stock',
    security: integrationWrite,
    request: {
      params: organizationResourceParams('itemId'),
      body: ItemStockAdjustmentSchema,
    },
    responses: {
      200: {
        description: 'Item stock adjusted',
        schema: successEnvelopeSchema(resourceSchema('item')),
      },
      ...clientErrors,
    },
    handler: itemStockController.integrationAdjust,
  })
  api.delete({
    path: `${itemBase}/:itemId`,
    summary: 'Delete an organization Billing item',
    security: integrationWrite,
    request: { params: organizationResourceParams('itemId') },
    responses: {
      200: {
        description: 'Item deleted',
        schema: successEnvelopeSchema(deletedSchema('item')),
      },
      ...clientErrors,
    },
    handler: controller.integrationItemsDelete,
  })
  api.get({
    path: '/integrations/organizations/:organizationId/plans',
    summary: 'List organization Billing plans',
    operationId:
      'billing-billing_get_integrations_organizations_organizationId_plans',
    security: { kind: 'integration', scope: 'billing.plans.read' },
    request: { params: organizationIdParams, query: planQuerySchema },
    responses: {
      200: {
        description: 'Plan list',
        schema: successEnvelopeSchema(listSchema('plan')),
      },
    },
    handler: controller.integrationPlansList,
  })
  return api.router
}
