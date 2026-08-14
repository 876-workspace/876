import type { Request, Response } from 'express'
import { getPrincipal } from '@/http/auth'
import { validBody, validParams } from '@/http/middleware/validate'
import type {
  ProviderConnectionCreateBody,
  ProviderConnectionUpdateBody,
} from './payment-providers.schemas'
import {
  createProviderConnection,
  listPaymentProviders,
  listProviderConnections,
  updateProviderConnection,
} from './payment-providers.service'

function tenant(req: Request) {
  const id = getPrincipal(req).tenantId
  if (!id) throw new Error('Tenant guard did not resolve a tenant.')
  return id
}
export const paymentProvidersController = {
  async listCatalog(_req: Request, res: Response) {
    res.json(await listPaymentProviders())
  },
  async listConnections(req: Request, res: Response) {
    res.json(await listProviderConnections(tenant(req)))
  },
  async createConnection(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await createProviderConnection(
          tenant(req),
          validBody<ProviderConnectionCreateBody>(req)
        )
      )
  },
  async updateConnection(req: Request, res: Response) {
    const { connectionId } = validParams<{ connectionId: string }>(req)
    res.json(
      await updateProviderConnection(
        tenant(req),
        connectionId,
        validBody<ProviderConnectionUpdateBody>(req)
      )
    )
  },
}
