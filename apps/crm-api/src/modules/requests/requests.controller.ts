import type { Request, Response } from 'express'
import type { SourceApp } from '../../types/request.js'

import { sendCrmError, sendCrmList, sendCrmResult } from '../../http/result.js'
import * as service from './requests.service.js'
import {
  createRequestBodySchema,
  createRequestForBillingCustomerBodySchema,
  billingCustomerRequestParamsSchema,
  deleteRequestBodySchema,
  listRequestsQuerySchema,
  listAcrossOrganizationsRequestsQuerySchema,
  organizationParamsSchema,
  requestParamsSchema,
  updateRequestBodySchema,
} from './requests.schemas.js'

export async function listAcrossOrganizationsRequests(
  req: Request,
  res: Response
) {
  const query = listAcrossOrganizationsRequestsQuerySchema.parse(req.query)
  const result = await service.listAcrossOrganizations({
    status: query.status,
    limit: query.limit,
    startingAfter: query.starting_after,
  })

  return sendCrmList(res, result, '/v1/requests')
}

export async function listRequests(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const filters = listRequestsQuerySchema.parse(req.query)
  const result = await service.list(organizationId, filters)
  return sendCrmList(
    res,
    result,
    `/v1/organizations/${organizationId}/requests`
  )
}

export async function retrieveRequest(req: Request, res: Response) {
  const { organizationId, id } = requestParamsSchema.parse(req.params)
  const result = await service.retrieve(organizationId, id)
  if (!result) return sendCrmError(res, 'crm/request-not-found')
  return sendCrmResult(res, result)
}

export async function createRequest(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const input = createRequestBodySchema.parse(req.body)
  const sourceApp = res.locals.crmServiceAppSlug as SourceApp | undefined
  const result = await service.create(organizationId, { ...input, sourceApp })
  return sendCrmResult(res, result, 201)
}

export async function listRequestsForBillingCustomer(
  req: Request,
  res: Response
) {
  const { organizationId, billingCustomerId } =
    billingCustomerRequestParamsSchema.parse(req.params)
  const filters = listRequestsQuerySchema
    .omit({ customerId: true })
    .parse(req.query)
  const result = await service.listForBillingCustomer(
    organizationId,
    billingCustomerId,
    filters
  )
  return sendCrmList(
    res,
    result,
    `/v1/organizations/${organizationId}/billing-customers/${billingCustomerId}/requests`
  )
}

export async function createRequestForBillingCustomer(
  req: Request,
  res: Response
) {
  const { organizationId, billingCustomerId } =
    billingCustomerRequestParamsSchema.parse(req.params)
  const input = createRequestForBillingCustomerBodySchema.parse(req.body)
  const sourceApp = res.locals.crmServiceAppSlug as SourceApp | undefined
  const result = await service.createForBillingCustomer(
    organizationId,
    billingCustomerId,
    { ...input, sourceApp }
  )
  return sendCrmResult(res, result, 201)
}

export async function updateRequest(req: Request, res: Response) {
  const { organizationId, id } = requestParamsSchema.parse(req.params)
  const input = updateRequestBodySchema.parse(req.body)
  const result = await service.update(organizationId, id, input)
  if (!result) return sendCrmError(res, 'crm/request-not-found')
  return sendCrmResult(res, result)
}

export async function deleteRequest(req: Request, res: Response) {
  const { organizationId, id } = requestParamsSchema.parse(req.params)
  const input = deleteRequestBodySchema.parse(req.body)
  const result = await service.remove(organizationId, id, input)
  if (!result) return sendCrmError(res, 'crm/request-not-found')
  return sendCrmResult(res, result)
}
