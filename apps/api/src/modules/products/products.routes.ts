import type { Router } from 'express'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { deletedObjectSchema, listObjectSchema } from '@/http/envelope'

import * as controller from './products.controller'
import * as docs from './products.docs'
import {
  createProductBodySchema,
  listProductsQuerySchema,
  priceCreateBodySchema,
  priceParamsSchema,
  priceSchema,
  productIdParamsSchema,
  productSchema,
  replaceProductModulesBodySchema,
  updatePriceBodySchema,
  updateProductBodySchema,
} from './products.schemas'

/**
 * Reading the catalog needs only an app API key — a pricing page has to render
 * before anyone signs in. Every write is admin, exactly as the FastAPI router
 * declares it: `AdminDep` on each mutating handler, nothing on the two reads.
 */
export function createProductsRouter(resolveGuards: GuardResolver): Router {
  const api = createApiRouter({
    tag: 'Products',
    prefix: '/products',
    security: 'admin',
    resolveGuards,
  })

  api.get({
    path: '',
    operationId: 'products-list_products',
    security: 'apiKey',
    summary: docs.LIST_PRODUCTS_SUMMARY,
    description: docs.LIST_PRODUCTS_DESCRIPTION,
    request: { query: listProductsQuerySchema },
    responses: {
      200: {
        description: 'Products returned.',
        schema: listObjectSchema(productSchema),
      },
    },
    handler: controller.listProducts,
  })

  api.post({
    path: '',
    operationId: 'products-create_product',
    summary: docs.CREATE_PRODUCT_SUMMARY,
    description: docs.CREATE_PRODUCT_DESCRIPTION,
    request: { body: createProductBodySchema },
    responses: {
      201: { description: 'Product created.', schema: productSchema },
      404: { description: 'App or tax code not found.' },
      409: { description: 'A product already uses this slug.' },
    },
    handler: controller.createProduct,
  })

  // Sub-resources are declared before '/:product_id' so Express cannot match
  // 'modules' or 'prices' as an id.
  api.put({
    path: '/:product_id/modules',
    operationId: 'products-replace_product_modules',
    summary: docs.REPLACE_PRODUCT_MODULES_SUMMARY,
    description: docs.REPLACE_PRODUCT_MODULES_DESCRIPTION,
    request: {
      params: productIdParamsSchema,
      body: replaceProductModulesBodySchema,
    },
    responses: {
      200: { description: 'Plan modules replaced.', schema: productSchema },
      404: { description: 'Product not found.' },
    },
    handler: controller.replaceProductModules,
  })

  api.post({
    path: '/:product_id/prices',
    operationId: 'products-create_price',
    summary: docs.CREATE_PRICE_SUMMARY,
    description: docs.CREATE_PRICE_DESCRIPTION,
    request: { params: productIdParamsSchema, body: priceCreateBodySchema },
    responses: {
      201: { description: 'Price created.', schema: priceSchema },
      404: { description: 'Product not found.' },
    },
    handler: controller.createPrice,
  })

  api.get({
    path: '/:product_id/prices/:price_id',
    operationId: 'products-retrieve_price',
    summary: docs.RETRIEVE_PRICE_SUMMARY,
    description: docs.RETRIEVE_PRICE_DESCRIPTION,
    request: { params: priceParamsSchema },
    responses: {
      200: { description: 'Price returned.', schema: priceSchema },
      404: { description: 'Price not found on this product.' },
    },
    handler: controller.retrievePrice,
  })

  api.patch({
    path: '/:product_id/prices/:price_id',
    operationId: 'products-update_price',
    summary: docs.UPDATE_PRICE_SUMMARY,
    description: docs.UPDATE_PRICE_DESCRIPTION,
    request: { params: priceParamsSchema, body: updatePriceBodySchema },
    responses: {
      200: { description: 'Price updated.', schema: priceSchema },
      404: { description: 'Price not found on this product.' },
    },
    handler: controller.updatePrice,
  })

  api.delete({
    path: '/:product_id/prices/:price_id',
    operationId: 'products-archive_price',
    summary: docs.ARCHIVE_PRICE_SUMMARY,
    description: docs.ARCHIVE_PRICE_DESCRIPTION,
    request: { params: priceParamsSchema },
    responses: {
      200: { description: 'Price archived.', schema: priceSchema },
      404: { description: 'Price not found on this product.' },
    },
    handler: controller.archivePrice,
  })

  api.get({
    path: '/:product_id',
    operationId: 'products-retrieve_product',
    security: 'apiKey',
    summary: 'Retrieve a product',
    description: 'Retrieves a product and its prices by its ID.',
    request: { params: productIdParamsSchema },
    responses: {
      200: { description: 'Product returned.', schema: productSchema },
      404: { description: 'Product not found.' },
    },
    handler: controller.retrieveProduct,
  })

  api.patch({
    path: '/:product_id',
    operationId: 'products-update_product',
    summary: docs.UPDATE_PRODUCT_SUMMARY,
    description: docs.UPDATE_PRODUCT_DESCRIPTION,
    request: { params: productIdParamsSchema, body: updateProductBodySchema },
    responses: {
      200: { description: 'Product updated.', schema: productSchema },
      404: { description: 'Product or tax code not found.' },
      409: { description: 'A product already uses this slug.' },
    },
    handler: controller.updateProduct,
  })

  api.delete({
    path: '/:product_id',
    operationId: 'products-archive_product',
    summary: docs.ARCHIVE_PRODUCT_SUMMARY,
    description: docs.ARCHIVE_PRODUCT_DESCRIPTION,
    request: { params: productIdParamsSchema },
    responses: {
      200: {
        description: 'Product archived.',
        schema: deletedObjectSchema('product'),
      },
      404: { description: 'Product not found.' },
    },
    handler: controller.archiveProduct,
  })

  return api.router
}
