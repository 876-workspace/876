import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type {
  VendorCreateBody,
  VendorListQuery,
  VendorUpdateBody,
} from './vendors.schemas'
import {
  createVendor,
  deleteVendor,
  listVendors,
  retrieveVendor,
  updateVendor,
} from './vendors.service'

function tenantId(req: Request): string {
  const tenantId = getPrincipal(req).tenantId
  if (!tenantId) throw new Error('Tenant guard did not resolve a tenant.')

  return tenantId
}

export const vendorsController = {
  async list(req: Request, res: Response) {
    res.json(await listVendors(tenantId(req), validQuery<VendorListQuery>(req)))
  },
  async retrieve(req: Request, res: Response) {
    const { vendorId } = validParams<{ vendorId: string }>(req)
    res.json(await retrieveVendor(tenantId(req), vendorId))
  },
  async create(req: Request, res: Response) {
    res.json(await createVendor(tenantId(req), validBody<VendorCreateBody>(req)))
  },
  async update(req: Request, res: Response) {
    const { vendorId } = validParams<{ vendorId: string }>(req)
    res.json(
      await updateVendor(
        tenantId(req),
        vendorId,
        validBody<VendorUpdateBody>(req)
      )
    )
  },
  async del(req: Request, res: Response) {
    const { vendorId } = validParams<{ vendorId: string }>(req)
    res.json(await deleteVendor(tenantId(req), vendorId))
  },
}
