import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  CouponCreatedSchema,
  CouponDeletedSchema,
  CouponSchema,
  CouponListSchema,
  PromotionCodeCreatedSchema,
  PromotionCodeListSchema,
} from '../schemas'
import type {
  Coupon,
  CouponCreateParams,
  CouponUpdateParams,
  List,
  PromotionCode,
  PromotionCodeCreateParams,
  RequestOptions,
} from '../types'

export function createDiscountsResource(runtime: Runtime) {
  return {
    coupons: {
      list(options?: RequestOptions) {
        return Request<List<Coupon>>(
          runtime,
          {
            method: 'GET',
            path: '/api/v1/discounts/coupons',
            signal: options?.signal,
          },
          CouponListSchema
        )
      },
      create(params: CouponCreateParams, options?: RequestOptions) {
        return Request(
          runtime,
          {
            method: 'POST',
            path: '/api/v1/discounts/coupons',
            body: params,
            signal: options?.signal,
          },
          CouponCreatedSchema
        )
      },
      retrieve(couponId: string, options?: RequestOptions) {
        return Request<Coupon>(
          runtime,
          {
            method: 'GET',
            path: `/api/v1/discounts/coupons/${encodeURIComponent(couponId)}`,
            signal: options?.signal,
          },
          CouponSchema
        )
      },
      update(
        couponId: string,
        params: CouponUpdateParams,
        options?: RequestOptions
      ) {
        return Request(
          runtime,
          {
            method: 'PATCH',
            path: `/api/v1/discounts/coupons/${encodeURIComponent(couponId)}`,
            body: params,
            signal: options?.signal,
          },
          CouponCreatedSchema
        )
      },
      delete(couponId: string, options?: RequestOptions) {
        return Request(
          runtime,
          {
            method: 'DELETE',
            path: `/api/v1/discounts/coupons/${encodeURIComponent(couponId)}`,
            signal: options?.signal,
          },
          CouponDeletedSchema
        )
      },
    },
    promotionCodes: {
      list(options?: RequestOptions) {
        return Request<List<PromotionCode>>(
          runtime,
          {
            method: 'GET',
            path: '/api/v1/discounts/promotion-codes',
            signal: options?.signal,
          },
          PromotionCodeListSchema
        )
      },
      create(params: PromotionCodeCreateParams, options?: RequestOptions) {
        return Request(
          runtime,
          {
            method: 'POST',
            path: '/api/v1/discounts/promotion-codes',
            body: params,
            signal: options?.signal,
          },
          PromotionCodeCreatedSchema
        )
      },
    },
  }
}
