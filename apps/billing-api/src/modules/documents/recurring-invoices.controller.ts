import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import { recurringInvoicesService } from './recurring-invoices.service'
import type {
  RecurringInvoiceCreateParams,
  RecurringInvoiceStatus,
  RecurringInvoiceUpdateParams,
} from './schemas/recurring-invoice'

function tenant(req: Request) {
  const tenantId = getPrincipal(req).tenantId
  if (!tenantId)
    throw new Error('Recurring Invoice guard did not resolve a tenant.')
  return tenantId
}
function id(req: Request) {
  return validParams<{ recurringInvoiceId: string }>(req).recurringInvoiceId
}
type Query = { status?: RecurringInvoiceStatus; customerId?: string }
function list(req: Request, res: Response, integration = false) {
  const query = validQuery<Query>(req)
  const base = integration
    ? `/api/v1/integrations/organizations/${validParams<{ organizationId: string }>(req).organizationId}/recurring-invoices`
    : '/api/v1/recurring-invoices'
  return recurringInvoicesService
    .list(tenant(req), query.status, query.customerId, base)
    .then((result) => res.json(result))
}

export const recurringInvoicesController = {
  list: (req: Request, res: Response) => list(req, res),
  integrationList: (req: Request, res: Response) => list(req, res, true),
  async retrieve(req: Request, res: Response) {
    res.json(await recurringInvoicesService.retrieve(tenant(req), id(req)))
  },
  async create(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await recurringInvoicesService.create(
          tenant(req),
          validBody<RecurringInvoiceCreateParams>(req)
        )
      )
  },
  async update(req: Request, res: Response) {
    res.json(
      await recurringInvoicesService.update(
        tenant(req),
        id(req),
        validBody<RecurringInvoiceUpdateParams>(req)
      )
    )
  },
  async pause(req: Request, res: Response) {
    res.json(
      await recurringInvoicesService.transition(tenant(req), id(req), 'pause')
    )
  },
  async resume(req: Request, res: Response) {
    res.json(
      await recurringInvoicesService.transition(tenant(req), id(req), 'resume')
    )
  },
  async stop(req: Request, res: Response) {
    res.json(
      await recurringInvoicesService.transition(tenant(req), id(req), 'stop')
    )
  },
  async delete(req: Request, res: Response) {
    res.json(await recurringInvoicesService.delete(tenant(req), id(req)))
  },
  async children(req: Request, res: Response) {
    const profileId = id(req)
    res.json(
      await recurringInvoicesService.children(
        tenant(req),
        profileId,
        `/api/v1/recurring-invoices/${profileId}/invoices`
      )
    )
  },
}
