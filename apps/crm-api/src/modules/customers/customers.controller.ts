import type { Request, Response } from 'express'

import * as service from './customers.service.js'
import {
  createCustomerBodySchema,
  customerParamsSchema,
  deleteCustomerBodySchema,
  listCustomersQuerySchema,
  organizationParamsSchema,
  updateCustomerBodySchema,
} from './customers.schemas.js'

function notFound(res: Response) {
  return res.status(404).json({
    data: null,
    error: { code: 'crm/customer-not-found', message: 'Customer not found.' },
  })
}

export async function listCustomers(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const query = listCustomersQuerySchema.parse(req.query)
  const result = await service.list(organizationId, query)

  res.json({
    data: {
      object: 'list',
      data: result.customers,
      has_more: result.hasMore,
      total_count: result.hasMore ? null : result.customers.length,
      url: `/v1/organizations/${organizationId}/customers`,
    },
    error: null,
  })
}

export async function retrieveCustomer(req: Request, res: Response) {
  const { organizationId, id } = customerParamsSchema.parse(req.params)
  const data = await service.retrieve(organizationId, id)
  if (!data) return notFound(res)

  res.json({ data, error: null })
}

export async function createCustomer(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const input = createCustomerBodySchema.parse(req.body)

  res.status(201).json({
    data: await service.create(organizationId, input),
    error: null,
  })
}

export async function updateCustomer(req: Request, res: Response) {
  const { organizationId, id } = customerParamsSchema.parse(req.params)
  const input = updateCustomerBodySchema.parse(req.body)
  const data = await service.update(organizationId, id, input)
  if (!data) return notFound(res)

  res.json({ data, error: null })
}

export async function deleteCustomer(req: Request, res: Response) {
  const { organizationId, id } = customerParamsSchema.parse(req.params)
  const input = deleteCustomerBodySchema.parse(req.body)
  const data = await service.remove(organizationId, id, input)
  if (!data) return notFound(res)

  res.json({ data, error: null })
}
