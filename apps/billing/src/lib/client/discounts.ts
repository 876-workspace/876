'use client'

import type {
  CouponCreateInput,
  CouponUpdateInput,
  PromotionCodeCreateInput,
} from '@/types/discount'

import { request } from './request'

const createCoupon = (params: CouponCreateInput) =>
  request<{ object: 'coupon'; id: string }>('/api/v1/discounts/coupons', {
    method: 'POST',
    body: JSON.stringify(params),
  })

const retrieveCoupon = (couponId: string) =>
  request<Record<string, unknown>>(
    `/api/v1/discounts/coupons/${encodeURIComponent(couponId)}`,
    { method: 'GET' }
  )

const updateCoupon = (couponId: string, params: CouponUpdateInput) =>
  request<{ object: 'coupon'; id: string }>(
    `/api/v1/discounts/coupons/${encodeURIComponent(couponId)}`,
    { method: 'PATCH', body: JSON.stringify(params) }
  )

const deleteCoupon = (couponId: string) =>
  request<{ object: 'coupon'; id: string; deleted: true }>(
    `/api/v1/discounts/coupons/${encodeURIComponent(couponId)}`,
    { method: 'DELETE' }
  )

const createPromotionCode = (params: PromotionCodeCreateInput) =>
  request<{ object: 'promotion_code'; id: string }>(
    '/api/v1/discounts/promotion-codes',
    { method: 'POST', body: JSON.stringify(params) }
  )

export const discounts = {
  coupons: {
    create: createCoupon,
    retrieve: retrieveCoupon,
    update: updateCoupon,
    delete: deleteCoupon,
  },
  promotionCodes: { create: createPromotionCode },
}
