import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type { SubscriptionEnsureParams } from './schemas/sync'
import type {
  SubscriptionAmendmentCreateParams,
  SubscriptionBulkInvoiceModeParams,
  SubscriptionCancelParams,
  SubscriptionChargeCreateParams,
  SubscriptionCreateServiceParams,
  SubscriptionCustomViewCreateParams,
  SubscriptionDiscountCreateParams,
  SubscriptionExtendParams,
  SubscriptionListParams,
  SubscriptionManualInvoiceParams,
  SubscriptionPauseParams,
  SubscriptionPreferenceUpdateParams,
  SubscriptionProrationPreviewParams,
  SubscriptionReactivateParams,
  SubscriptionResumeParams,
} from './schemas/subscription'
import { subscriptionsService as service } from './subscriptions.service'

function tenant(req: Request): string {
  const tenantId = getPrincipal(req).tenantId
  if (!tenantId) throw new Error('Subscription guard did not resolve a tenant.')

  return tenantId
}

function param(req: Request, name: string): string {
  return validParams<Record<string, string>>(req)[name]!
}

function owner(req: Request): string | undefined {
  return getPrincipal(req).userId ?? undefined
}

function sourceApp(req: Request): string | undefined {
  const principal = getPrincipal(req)
  return principal.platformAdmin ? undefined : (principal.appId ?? undefined)
}

export const subscriptionsController = {
  async list(req: Request, res: Response) {
    res.json(
      await service.list(
        tenant(req),
        validQuery<SubscriptionListParams>(req),
        owner(req)
      )
    )
  },
  async integrationList(req: Request, res: Response) {
    const organizationId = param(req, 'organizationId')
    res.json(
      await service.list(
        tenant(req),
        validQuery<SubscriptionListParams>(req),
        owner(req),
        sourceApp(req),
        `/api/v1/integrations/organizations/${organizationId}/subscriptions`
      )
    )
  },
  async create(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await service.create(
          tenant(req),
          validBody<SubscriptionCreateServiceParams>(req)
        )
      )
  },
  async remove(req: Request, res: Response) {
    res.json(await service.remove(tenant(req), param(req, 'subscriptionId')))
  },
  async amend(req: Request, res: Response) {
    res.json(
      await service.amend(
        tenant(req),
        param(req, 'subscriptionId'),
        validBody<SubscriptionAmendmentCreateParams>(req)
      )
    )
  },
  async bill(req: Request, res: Response) {
    res.json(
      await service.bill(
        tenant(req),
        param(req, 'subscriptionId'),
        validBody<SubscriptionManualInvoiceParams>(req)
      )
    )
  },
  async pause(req: Request, res: Response) {
    res.json(
      await service.pause(
        tenant(req),
        param(req, 'subscriptionId'),
        validBody<SubscriptionPauseParams>(req)
      )
    )
  },
  async resume(req: Request, res: Response) {
    res.json(
      await service.resume(
        tenant(req),
        param(req, 'subscriptionId'),
        validBody<SubscriptionResumeParams>(req)
      )
    )
  },
  async cancel(req: Request, res: Response) {
    res.json(
      await service.cancel(
        tenant(req),
        param(req, 'subscriptionId'),
        validBody<SubscriptionCancelParams>(req)
      )
    )
  },
  async reactivate(req: Request, res: Response) {
    res.json(
      await service.reactivate(
        tenant(req),
        param(req, 'subscriptionId'),
        validBody<SubscriptionReactivateParams>(req)
      )
    )
  },
  async extend(req: Request, res: Response) {
    res.json(
      await service.extend(
        tenant(req),
        param(req, 'subscriptionId'),
        validBody<SubscriptionExtendParams>(req)
      )
    )
  },
  async previewProration(req: Request, res: Response) {
    res.json(
      await service.previewProration(
        tenant(req),
        param(req, 'subscriptionId'),
        validBody<SubscriptionProrationPreviewParams>(req)
      )
    )
  },
  async upcomingInvoice(req: Request, res: Response) {
    res.json(
      await service.upcomingInvoice(tenant(req), param(req, 'subscriptionId'))
    )
  },
  async chargesList(req: Request, res: Response) {
    res.json(
      await service.listCharges(tenant(req), param(req, 'subscriptionId'))
    )
  },
  async chargesCreate(req: Request, res: Response) {
    res.json(
      await service.createCharge(
        tenant(req),
        param(req, 'subscriptionId'),
        validBody<SubscriptionChargeCreateParams>(req)
      )
    )
  },
  async chargesVoid(req: Request, res: Response) {
    res.json(
      await service.voidCharge(
        tenant(req),
        param(req, 'subscriptionId'),
        param(req, 'chargeId')
      )
    )
  },
  async discountsList(req: Request, res: Response) {
    res.json(
      await service.listDiscounts(tenant(req), param(req, 'subscriptionId'))
    )
  },
  async discountsCreate(req: Request, res: Response) {
    res.json(
      await service.createDiscount(
        tenant(req),
        param(req, 'subscriptionId'),
        validBody<SubscriptionDiscountCreateParams>(req)
      )
    )
  },
  async discountsRemove(req: Request, res: Response) {
    res.json(
      await service.removeDiscount(
        tenant(req),
        param(req, 'subscriptionId'),
        param(req, 'discountId')
      )
    )
  },
  async preferences(req: Request, res: Response) {
    res.json(await service.preferences(tenant(req)))
  },
  async updatePreferences(req: Request, res: Response) {
    res.json(
      await service.updatePreferences(
        tenant(req),
        validBody<SubscriptionPreferenceUpdateParams>(req)
      )
    )
  },
  async updateInvoiceModes(req: Request, res: Response) {
    res.json(
      await service.updateInvoiceModes(
        tenant(req),
        validBody<SubscriptionBulkInvoiceModeParams>(req)
      )
    )
  },
  async viewsList(req: Request, res: Response) {
    res.json(await service.listViews(tenant(req), owner(req)))
  },
  async viewsCreate(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await service.createView(
          tenant(req),
          validBody<SubscriptionCustomViewCreateParams>(req),
          owner(req)
        )
      )
  },
  async viewsUpdate(req: Request, res: Response) {
    res.json(
      await service.updateView(
        tenant(req),
        param(req, 'viewId'),
        validBody<SubscriptionCustomViewCreateParams>(req),
        owner(req)
      )
    )
  },
  async viewsDelete(req: Request, res: Response) {
    res.json(
      await service.deleteView(tenant(req), param(req, 'viewId'), owner(req))
    )
  },
  async ensure(req: Request, res: Response) {
    res.json(await service.ensure(validBody<SubscriptionEnsureParams>(req)))
  },
}
