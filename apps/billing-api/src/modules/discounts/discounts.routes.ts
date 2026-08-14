import { z } from 'zod'
import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'
import { discountsController as controller } from './discounts.controller'
import {
  CouponCreateSchema,
  CouponUpdateSchema,
  PromotionCodeCreateSchema,
} from './discounts.schemas'

const params = z.strictObject({ couponId: z.string().min(1) })
const query = z.strictObject({ active: z.enum(['true', 'false']).optional() })
const resource = (object: string) =>
  z.object({ object: z.literal(object), id: z.string() }).passthrough()
const list = (object: string) =>
  z.strictObject({
    object: z.literal('list'),
    data: z.array(resource(object)),
    has_more: z.boolean(),
    total_count: z.number().int().nullable(),
    url: z.string(),
  })
const errors = {
  '4XX': { description: 'Client Error', schema: errorEnvelopeSchema },
}
export function createDiscountsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Discounts', resolveGuards })
  const read = { kind: 'tenant' as const, permission: 'subscriptions:read' }
  const write = { kind: 'tenant' as const, permission: 'subscriptions:write' }
  api.get({
    path: '/discounts/coupons',
    summary: 'List coupons',
    security: read,
    request: { query },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(list('coupon')),
      },
      ...errors,
    },
    handler: controller.listCoupons,
  })
  api.post({
    path: '/discounts/coupons',
    summary: 'Create a coupon',
    security: write,
    request: { body: CouponCreateSchema },
    responses: {
      201: {
        description: 'Created',
        schema: successEnvelopeSchema(resource('coupon')),
      },
      ...errors,
    },
    handler: controller.createCoupon,
  })
  api.get({
    path: '/discounts/coupons/:couponId',
    summary: 'Retrieve a coupon',
    security: read,
    request: { params },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resource('coupon')),
      },
      ...errors,
    },
    handler: controller.getCoupon,
  })
  api.patch({
    path: '/discounts/coupons/:couponId',
    summary: 'Update a coupon',
    security: write,
    request: { params, body: CouponUpdateSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resource('coupon')),
      },
      ...errors,
    },
    handler: controller.updateCoupon,
  })
  api.delete({
    path: '/discounts/coupons/:couponId',
    summary: 'Delete a coupon',
    security: write,
    request: { params },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(
          resource('coupon').extend({ deleted: z.literal(true) })
        ),
      },
      ...errors,
    },
    handler: controller.deleteCoupon,
  })
  api.get({
    path: '/discounts/promotion-codes',
    summary: 'List promotion codes',
    security: read,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(list('promotion_code')),
      },
      ...errors,
    },
    handler: controller.listCodes,
  })
  api.post({
    path: '/discounts/promotion-codes',
    summary: 'Create a promotion code',
    security: write,
    request: { body: PromotionCodeCreateSchema },
    responses: {
      201: {
        description: 'Created',
        schema: successEnvelopeSchema(resource('promotion_code')),
      },
      ...errors,
    },
    handler: controller.createCode,
  })
  return api.router
}
