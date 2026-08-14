import type { Request, Response } from 'express'
import { getPrincipal } from '@/http/auth'
import { validBody, validParams } from '@/http/middleware/validate'
import type {
  TaxAuthorityCreateBody,
  TaxAuthorityUpdateBody,
  TaxRateCreateBody,
  TaxRateUpdateBody,
} from './tax.schemas'
import {
  createTaxAuthority,
  createTaxRate,
  listTaxAuthorities,
  listTaxRates,
  updateTaxAuthority,
  updateTaxRate,
} from './tax.service'

function tenant(req: Request): string {
  const id = getPrincipal(req).tenantId
  if (!id) throw new Error('Tenant guard did not resolve a tenant.')
  return id
}
export const taxController = {
  async listAuthorities(req: Request, res: Response) {
    res.json(await listTaxAuthorities(tenant(req)))
  },
  async createAuthority(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await createTaxAuthority(
          tenant(req),
          validBody<TaxAuthorityCreateBody>(req)
        )
      )
  },
  async updateAuthority(req: Request, res: Response) {
    const { taxAuthorityId } = validParams<{ taxAuthorityId: string }>(req)
    res.json(
      await updateTaxAuthority(
        tenant(req),
        taxAuthorityId,
        validBody<TaxAuthorityUpdateBody>(req)
      )
    )
  },
  async listRates(req: Request, res: Response) {
    res.json(await listTaxRates(tenant(req)))
  },
  async createRate(req: Request, res: Response) {
    res
      .status(201)
      .json(await createTaxRate(tenant(req), validBody<TaxRateCreateBody>(req)))
  },
  async updateRate(req: Request, res: Response) {
    const { taxRateId } = validParams<{ taxRateId: string }>(req)
    res.json(
      await updateTaxRate(
        tenant(req),
        taxRateId,
        validBody<TaxRateUpdateBody>(req)
      )
    )
  },
}
