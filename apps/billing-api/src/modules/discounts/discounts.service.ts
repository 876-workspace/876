import { Prisma } from '@/db'
import { AppHttpError } from '@/http/errors'

import { discounts } from './discounts.repository'
import type {
  CouponCreateParams,
  CouponUpdateParams,
  PromotionCodeCreateParams,
  ServiceResult,
} from './discounts.schemas'

function value(input: unknown): unknown {
  if (typeof input === 'bigint' || input instanceof Prisma.Decimal)
    return input.toString()
  if (Array.isArray(input)) return input.map(value)
  if (input && typeof input === 'object')
    return Object.fromEntries(
      Object.entries(input).map(([key, item]) => [key, value(item)])
    )
  return input
}
function resource(object: string, row: unknown) {
  return { object, ...(value(row) as Record<string, unknown>) }
}
async function unwrap<T>(result: Awaited<ServiceResult<T>>, kind: string) {
  if (result.error === null) return result.data
  const status = result.status ?? 500
  throw new AppHttpError({
    code:
      status === 404
        ? `${kind}/not-found`
        : status === 409
          ? `${kind}/conflict`
          : status === 422
            ? 'validation/invalid-request'
            : 'internal/error',
    message: result.error,
    httpStatus: status,
  })
}
function list(object: string, rows: unknown[], url: string) {
  return {
    object: 'list' as const,
    data: rows.map((row) => resource(object, row)),
    has_more: false,
    total_count: rows.length,
    url,
  }
}

export const discountsService = {
  async listCoupons(tenantId: string, active?: boolean) {
    return list(
      'coupon',
      await discounts.coupons.list(tenantId, active),
      '/api/v1/discounts/coupons'
    )
  },
  async getCoupon(tenantId: string, id: string) {
    const row = await discounts.coupons.retrieve(tenantId, id)
    if (!row)
      throw new AppHttpError({
        code: 'coupon/not-found',
        message: 'Coupon not found.',
        httpStatus: 404,
      })
    return resource('coupon', row)
  },
  async createCoupon(tenantId: string, body: CouponCreateParams) {
    return {
      object: 'coupon',
      ...(await unwrap(
        await discounts.coupons.create(tenantId, body),
        'coupon'
      )),
    }
  },
  async updateCoupon(tenantId: string, id: string, body: CouponUpdateParams) {
    return {
      object: 'coupon',
      ...(await unwrap(
        await discounts.coupons.update(tenantId, id, body),
        'coupon'
      )),
    }
  },
  async deleteCoupon(tenantId: string, id: string) {
    return {
      object: 'coupon',
      ...(await unwrap(await discounts.coupons.delete(tenantId, id), 'coupon')),
      deleted: true,
    }
  },
  async listPromotionCodes(tenantId: string) {
    return list(
      'promotion_code',
      await discounts.promotionCodes.list(tenantId),
      '/api/v1/discounts/promotion-codes'
    )
  },
  async createPromotionCode(tenantId: string, body: PromotionCodeCreateParams) {
    return {
      object: 'promotion_code',
      ...(await unwrap(
        await discounts.promotionCodes.create(tenantId, body),
        'promotion_code'
      )),
    }
  },
}
