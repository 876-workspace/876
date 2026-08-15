import type { Request, Response } from 'express'
import { getPrincipal } from '@/http/auth'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'
import type {
  CouponCreateParams,
  CouponUpdateParams,
  PromotionCodeCreateParams,
} from './discounts.schemas'
import { discountsService as service } from './discounts.service'

function tenant(req: Request) {
  const id = getPrincipal(req).tenantId
  if (!id) throw new Error('Discount guard did not resolve a tenant.')
  return id
}
function couponId(req: Request) {
  return validParams<{ couponId: string }>(req).couponId
}
export const discountsController = {
  async listCoupons(req: Request, res: Response) {
    const query = validQuery<{ active?: string }>(req)
    res.json(
      await service.listCoupons(
        tenant(req),
        query.active === undefined ? undefined : query.active === 'true'
      )
    )
  },
  async getCoupon(req: Request, res: Response) {
    res.json(await service.getCoupon(tenant(req), couponId(req)))
  },
  async createCoupon(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await service.createCoupon(
          tenant(req),
          validBody<CouponCreateParams>(req)
        )
      )
  },
  async updateCoupon(req: Request, res: Response) {
    res.json(
      await service.updateCoupon(
        tenant(req),
        couponId(req),
        validBody<CouponUpdateParams>(req)
      )
    )
  },
  async deleteCoupon(req: Request, res: Response) {
    res.json(await service.deleteCoupon(tenant(req), couponId(req)))
  },
  async listCodes(req: Request, res: Response) {
    res.json(await service.listPromotionCodes(tenant(req)))
  },
  async createCode(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await service.createPromotionCode(
          tenant(req),
          validBody<PromotionCodeCreateParams>(req)
        )
      )
  },
}
