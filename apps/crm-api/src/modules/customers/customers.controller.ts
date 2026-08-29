import { isError, toAppError } from '@876/core'
import type { Request, Response } from 'express'

import { sendCrmError, sendCrmResult } from '../../http/result.js'
import * as service from './customers.service.js'
import {
  createCustomerBodySchema,
  customerParamsSchema,
  deleteCustomerBodySchema,
  listCustomersQuerySchema,
  organizationParamsSchema,
  updateCustomerBodySchema,
} from './customers.schemas.js'

export async function listCustomers(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const query = listCustomersQuerySchema.parse(req.query)
  const result = await service.list(organizationId, query)
  if (isError(result))
    return res
      .status(result.httpStatus)
      .json({ data: null, error: toAppError(result) })

  return res.json({
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
  const result = await service.retrieve(organizationId, id)
  if (!result) return sendCrmError(res, 'crm/customer-not-found')
  return sendCrmResult(res, result)
}

export async function createCustomer(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const input = createCustomerBodySchema.parse(req.body)
  const result = await service.create(organizationId, input)
  return sendCrmResult(res, result, 201)
}

export async function updateCustomer(req: Request, res: Response) {
  const { organizationId, id } = customerParamsSchema.parse(req.params)
  const input = updateCustomerBodySchema.parse(req.body)
  const result = await service.update(organizationId, id, input)
  if (!result) return sendCrmError(res, 'crm/customer-not-found')
  return sendCrmResult(res, result)
}

export async function deleteCustomer(req: Request, res: Response) {
  const { organizationId, id } = customerParamsSchema.parse(req.params)
  const input = deleteCustomerBodySchema.parse(req.body)
  const result = await service.remove(organizationId, id, input)
  if (!result) return sendCrmError(res, 'crm/customer-not-found')
  return sendCrmResult(res, result)
}
