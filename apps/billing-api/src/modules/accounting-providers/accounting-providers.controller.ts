import type { Request, Response } from 'express'

import {
  validBody,
  validParams,
  validQuery,
} from '@/http/middleware/validate'
import { tenantAuthorizationByOrganizationId } from '@/modules/tenants'
import { AppHttpError } from '@/http/errors'

import type {
  AccountingConnectionCreateBody,
  AccountingConnectionUpdateBody,
  AccountingReconcileBody,
  ZohoOauthCallbackQuery,
} from './accounting-providers.schemas'
import {
  authorizeAccountingConnection,
  completeZohoOauth,
  createAccountingConnection,
  deleteAccountingConnection,
  listAccountingConnections,
  listAccountingProviders,
  retrieveAccountingConnection,
  updateAccountingConnection,
  validateAccountingConnection,
} from './accounting-providers.service'
import { reconcileAccountingConnection } from './accounting-sync.service'

async function accountingTenantId(organizationId: string) {
  const tenant = await tenantAuthorizationByOrganizationId(organizationId)
  if (!tenant || !tenant.active)
    throw new AppHttpError({
      code: 'billing/workspace-not-found',
      message: 'The Billing workspace was not found.',
      httpStatus: 404,
    })
  return tenant.id
}

export const accountingProvidersController = {
  async listProviders(_req: Request, res: Response) {
    res.json(await listAccountingProviders())
  },
  async listConnections(req: Request, res: Response) {
    const { organizationId } = validParams<{ organizationId: string }>(req)
    res.json(await listAccountingConnections(organizationId))
  },
  async createConnection(req: Request, res: Response) {
    const { organizationId } = validParams<{ organizationId: string }>(req)
    res.status(201).json(
      await createAccountingConnection(
        organizationId,
        validBody<AccountingConnectionCreateBody>(req)
      )
    )
  },
  async retrieveConnection(req: Request, res: Response) {
    const { organizationId, connectionId } = validParams<{
      organizationId: string
      connectionId: string
    }>(req)
    res.json(await retrieveAccountingConnection(organizationId, connectionId))
  },
  async updateConnection(req: Request, res: Response) {
    const { organizationId, connectionId } = validParams<{
      organizationId: string
      connectionId: string
    }>(req)
    res.json(
      await updateAccountingConnection(
        organizationId,
        connectionId,
        validBody<AccountingConnectionUpdateBody>(req)
      )
    )
  },
  async deleteConnection(req: Request, res: Response) {
    const { organizationId, connectionId } = validParams<{
      organizationId: string
      connectionId: string
    }>(req)
    res.json(await deleteAccountingConnection(organizationId, connectionId))
  },
  async authorize(req: Request, res: Response) {
    const { organizationId, connectionId } = validParams<{
      organizationId: string
      connectionId: string
    }>(req)
    res.json(await authorizeAccountingConnection(organizationId, connectionId))
  },
  async validate(req: Request, res: Response) {
    const { organizationId, connectionId } = validParams<{
      organizationId: string
      connectionId: string
    }>(req)
    res.json(await validateAccountingConnection(organizationId, connectionId))
  },
  async reconcile(req: Request, res: Response) {
    const { organizationId, connectionId } = validParams<{
      organizationId: string
      connectionId: string
    }>(req)
    const body = validBody<AccountingReconcileBody>(req)
    const result = await reconcileAccountingConnection({
      tenantId: await accountingTenantId(organizationId),
      connectionId,
      resourceTypes: body.resourceTypes,
    })
    if (!result)
      throw new AppHttpError({
        code: 'billing/accounting-provider-connection-not-found',
        message: 'Accounting provider connection not found.',
        httpStatus: 404,
      })
    res.json(result)
  },
  async zohoCallback(req: Request, res: Response) {
    res.json(await completeZohoOauth(validQuery<ZohoOauthCallbackQuery>(req)))
  },
}
