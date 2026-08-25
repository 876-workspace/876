import type { Request, Response } from 'express'

import * as service from './customers.service.js'
import {
  createCustomerBodySchema,
  customerParamsSchema,
  deleteCustomerBodySchema,
  organizationParamsSchema,
  updateCustomerBodySchema,
} from './customers.schemas.js'

export async function listCustomers(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  res.json({ data: await service.list(organizationId) })
}

export async function retrieveCustomer(req: Request, res: Response) {
  const { organizationId, id } = customerParamsSchema.parse(req.params)
  const data = await service.retrieve(organizationId, id)
  if (!data) return res.status(404).json({ error: 'Customer not found.', code: 'crm/customer-not-found' })
  res.json({ data })
}

export async function createCustomer(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const input = createCustomerBodySchema.parse(req.body)
  res.status(201).json({ data: await service.create(organizationId, input) })
}

export async function updateCustomer(req: Request, res: Response) {
  const { organizationId, id } = customerParamsSchema.parse(req.params)
  const input = updateCustomerBodySchema.parse(req.body)
  const data = await service.update(organizationId, id, input)
  if (!data) return res.status(404).json({ error: 'Customer not found.', code: 'crm/customer-not-found' })
  res.json({ data })
}

export async function deleteCustomer(req: Request, res: Response) {
  const { organizationId, id } = customerParamsSchema.parse(req.params)
  const input = deleteCustomerBodySchema.parse(req.body)
  const data = await service.remove(organizationId, id, input)
  if (!data) return res.status(404).json({ error: 'Customer not found.', code: 'crm/customer-not-found' })
  res.json({ data })
}
