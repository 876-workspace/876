import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { integrationAttribution } from '@/http/integration/idempotency'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type {
  CustomerCreateBody,
  CustomerEnsureBody,
  CustomerImportBody,
  CustomerListQuery,
  CustomerUpdateBody,
  IntegrationCustomerListQuery,
  LinkCustomerBody,
  OpeningBalanceBody,
} from './customers.schemas'
import {
  createCustomer,
  customerAccount,
  deleteCustomer,
  ensureCoreCustomer,
  importCustomers,
  linkCustomer,
  listCustomers,
  recordOpeningBalance,
  retrieveCustomer,
  unlinkCustomer,
  updateCustomer,
} from './customers.service'

function tenant(req: Request) {
  const id = getPrincipal(req).tenantId
  if (!id) throw new Error('Customer route guard did not resolve a tenant.')
  return id
}
function sourceApp(req: Request) {
  const principal = getPrincipal(req)
  return principal.platformAdmin ? undefined : (principal.appId ?? undefined)
}

export const customersController = {
  async list(req: Request, res: Response) {
    res.json(
      await listCustomers(tenant(req), validQuery<CustomerListQuery>(req))
    )
  },
  async retrieve(req: Request, res: Response) {
    res.json(
      await retrieveCustomer(
        tenant(req),
        validParams<{ customerId: string }>(req).customerId
      )
    )
  },
  async create(req: Request, res: Response) {
    const result = await createCustomer(
      tenant(req),
      validBody<CustomerCreateBody>(req)
    )
    res.status(201).json({ object: 'customer', id: result.customer.id })
  },
  async update(req: Request, res: Response) {
    res.json(
      await updateCustomer(
        tenant(req),
        validParams<{ customerId: string }>(req).customerId,
        validBody<CustomerUpdateBody>(req)
      )
    )
  },
  async del(req: Request, res: Response) {
    res.json(
      await deleteCustomer(
        tenant(req),
        validParams<{ customerId: string }>(req).customerId
      )
    )
  },
  async account(req: Request, res: Response) {
    res.json(
      await customerAccount(
        tenant(req),
        validParams<{ customerId: string }>(req).customerId
      )
    )
  },
  async link(req: Request, res: Response) {
    res.json(
      await linkCustomer(
        tenant(req),
        validParams<{ customerId: string }>(req).customerId,
        validBody<LinkCustomerBody>(req)
      )
    )
  },
  async unlink(req: Request, res: Response) {
    res.json(
      await unlinkCustomer(
        tenant(req),
        validParams<{ customerId: string }>(req).customerId
      )
    )
  },
  async openingBalance(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await recordOpeningBalance(
          tenant(req),
          validParams<{ customerId: string }>(req).customerId,
          validBody<OpeningBalanceBody>(req)
        )
      )
  },
  async importRows(req: Request, res: Response) {
    res.json(
      await importCustomers(tenant(req), validBody<CustomerImportBody>(req))
    )
  },
  async ensure(req: Request, res: Response) {
    res.json(await ensureCoreCustomer(validBody<CustomerEnsureBody>(req)))
  },
  async integrationList(req: Request, res: Response) {
    const query = validQuery<IntegrationCustomerListQuery>(req)
    res.json(
      await listCustomers(
        tenant(req),
        {
          status: query.status,
          userId: query.user_id,
          organizationId: query.organization_id,
          ids:
            query.ids === undefined
              ? undefined
              : (Array.isArray(query.ids)
                  ? query.ids
                  : query.ids.split(',')
                ).filter(Boolean),
          starting_after: query.starting_after,
          ending_before: query.ending_before,
          limit: query.limit,
        },
        sourceApp(req)
      )
    )
  },
  async integrationRetrieve(req: Request, res: Response) {
    res.json(
      await retrieveCustomer(
        tenant(req),
        validParams<{ customerId: string }>(req).customerId
      )
    )
  },
  async integrationCreate(req: Request, res: Response) {
    const body = validBody<CustomerCreateBody>(req)
    const attribution = integrationAttribution(
      req,
      getPrincipal(req),
      body as Record<string, unknown>
    )
    const result = await createCustomer(tenant(req), body, attribution)
    res
      .status(result.replayed ? 200 : 201)
      .json(
        result.replayed
          ? result.customer
          : { object: 'customer', id: result.customer.id }
      )
  },
  async integrationUpdate(req: Request, res: Response) {
    res.json(
      await updateCustomer(
        tenant(req),
        validParams<{ customerId: string }>(req).customerId,
        validBody<CustomerUpdateBody>(req),
        sourceApp(req)
      )
    )
  },
  async integrationDelete(req: Request, res: Response) {
    res.json(
      await deleteCustomer(
        tenant(req),
        validParams<{ customerId: string }>(req).customerId,
        sourceApp(req)
      )
    )
  },
}
