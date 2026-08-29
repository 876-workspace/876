import type { Request, Response } from 'express'

import {
  sendCrmError,
  sendCrmList,
  sendCrmResult,
} from '../../http/result.js'
import * as service from './request-forms.service.js'
import {
  createRequestFormBodySchema,
  deleteRequestFormBodySchema,
  listFormCustomerRequestsQuerySchema,
  listRequestFormsQuerySchema,
  requestFormOrganizationParamsSchema,
  requestFormParamsSchema,
  submitRequestFormBodySchema,
  updateRequestFormBodySchema,
} from './request-forms.schemas.js'

export async function listRequestForms(req: Request, res: Response) {
  const { organizationId } = requestFormOrganizationParamsSchema.parse(req.params)
  const { status } = listRequestFormsQuerySchema.parse(req.query)
  const result = await service.list(organizationId, status)
  return sendCrmList(
    res,
    result,
    `/v1/organizations/${organizationId}/request-forms`
  )
}

export async function retrieveRequestForm(req: Request, res: Response) {
  const { organizationId, id } = requestFormParamsSchema.parse(req.params)
  const result = await service.retrieve(organizationId, id)
  if (!result) return sendCrmError(res, 'crm/form-not-found')
  return sendCrmResult(res, result)
}

export async function createRequestForm(req: Request, res: Response) {
  const { organizationId } = requestFormOrganizationParamsSchema.parse(req.params)
  const input = createRequestFormBodySchema.parse(req.body)
  const result = await service.create(organizationId, input)
  return sendCrmResult(res, result, 201)
}

export async function updateRequestForm(req: Request, res: Response) {
  const { organizationId, id } = requestFormParamsSchema.parse(req.params)
  const input = updateRequestFormBodySchema.parse(req.body)
  const result = await service.update(organizationId, id, input)
  if (!result) return sendCrmError(res, 'crm/form-not-found')
  return sendCrmResult(res, result)
}

export async function deleteRequestForm(req: Request, res: Response) {
  const { organizationId, id } = requestFormParamsSchema.parse(req.params)
  const input = deleteRequestFormBodySchema.parse(req.body)
  const result = await service.remove(organizationId, id, input)
  if (!result) return sendCrmError(res, 'crm/form-not-found')
  return sendCrmResult(res, result)
}

export async function submitRequestForm(req: Request, res: Response) {
  const { organizationId, id } = requestFormParamsSchema.parse(req.params)
  const input = submitRequestFormBodySchema.parse(req.body)
  const result = await service.submit(organizationId, id, input)
  return sendCrmResult(res, result, 201)
}

export async function listFormCustomerRequests(req: Request, res: Response) {
  const { organizationId, id } = requestFormParamsSchema.parse(req.params)
  const query = listFormCustomerRequestsQuerySchema.parse(req.query)
  const result = await service.listCustomerRequests(organizationId, id, query)
  return sendCrmList(
    res,
    result,
    `/v1/organizations/${organizationId}/request-forms/${id}/requests`
  )
}

export async function listRequestFormSubmissions(req: Request, res: Response) {
  const { organizationId, id } = requestFormParamsSchema.parse(req.params)
  const result = await service.listSubmissions(organizationId, id)
  return sendCrmList(
    res,
    result,
    `/v1/organizations/${organizationId}/request-forms/${id}/submissions`
  )
}
