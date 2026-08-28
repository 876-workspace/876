import { isError, toAppError } from '@876/core'
import type { Request, Response } from 'express'

import { sendCrmError, sendCrmResult } from '../../http/result.js'
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

function listResponse(res: Response, data: unknown[], url: string) {
  return res.json({
    data: {
      object: 'list',
      data,
      has_more: false,
      total_count: data.length,
      url,
    },
    error: null,
  })
}

function sendIfError(res: Response, result: unknown) {
  if (!isError(result)) return false
  res
    .status(result.httpStatus)
    .json({ data: null, error: toAppError(result) })
  return true
}

export async function listRequestForms(req: Request, res: Response) {
  const { organizationId } = requestFormOrganizationParamsSchema.parse(req.params)
  const { status } = listRequestFormsQuerySchema.parse(req.query)
  const result = await service.list(organizationId, status)
  if (sendIfError(res, result)) return
  return listResponse(
    res,
    result as unknown[],
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
  if (sendIfError(res, result)) return
  return listResponse(
    res,
    result as unknown[],
    `/v1/organizations/${organizationId}/request-forms/${id}/requests`
  )
}

export async function listRequestFormSubmissions(req: Request, res: Response) {
  const { organizationId, id } = requestFormParamsSchema.parse(req.params)
  const result = await service.listSubmissions(organizationId, id)
  if (sendIfError(res, result)) return
  return listResponse(
    res,
    result as unknown[],
    `/v1/organizations/${organizationId}/request-forms/${id}/submissions`
  )
}
