import type { Request, Response } from 'express'

import {
  validBody,
  validParams,
  validQuery,
} from '@/http/middleware/validate'

import type {
  AccountingConnectionCreateBody,
  AccountingConnectionUpdateBody,
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
    res
      .status(201)
      .json(
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
  async zohoCallback(req: Request, res: Response) {
    res.json(await completeZohoOauth(validQuery<ZohoOauthCallbackQuery>(req)))
  },
}
