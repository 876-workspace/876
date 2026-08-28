import type { Request, Response } from 'express'

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

function notFound(res: Response) {
  return res.status(404).json({
    data: null,
    error: { code: 'crm/form-not-found', message: 'Request form not found.' },
  })
}

export async function listRequestForms(req: Request, res: Response) {
  const { organizationId } = requestFormOrganizationParamsSchema.parse(
    req.params
  )
  const { status } = listRequestFormsQuerySchema.parse(req.query)
  const data = await service.list(organizationId, status)

  res.json({
    data: {
      object: 'list',
      data,
      has_more: false,
      total_count: data.length,
      url: `/v1/organizations/${organizationId}/request-forms`,
    },
    error: null,
  })
}

export async function retrieveRequestForm(req: Request, res: Response) {
  const { organizationId, id } = requestFormParamsSchema.parse(req.params)
  const data = await service.retrieve(organizationId, id)
  if (!data) return notFound(res)

  res.json({ data, error: null })
}

export async function createRequestForm(req: Request, res: Response) {
  const { organizationId } = requestFormOrganizationParamsSchema.parse(
    req.params
  )
  const input = createRequestFormBodySchema.parse(req.body)

  res.status(201).json({
    data: await service.create(organizationId, input),
    error: null,
  })
}

export async function updateRequestForm(req: Request, res: Response) {
  const { organizationId, id } = requestFormParamsSchema.parse(req.params)
  const input = updateRequestFormBodySchema.parse(req.body)
  const data = await service.update(organizationId, id, input)
  if (!data) return notFound(res)

  res.json({ data, error: null })
}

export async function deleteRequestForm(req: Request, res: Response) {
  const { organizationId, id } = requestFormParamsSchema.parse(req.params)
  const input = deleteRequestFormBodySchema.parse(req.body)
  const data = await service.remove(organizationId, id, input)
  if (!data) return notFound(res)

  res.json({ data, error: null })
}

export async function submitRequestForm(req: Request, res: Response) {
  const { organizationId, id } = requestFormParamsSchema.parse(req.params)
  const input = submitRequestFormBodySchema.parse(req.body)

  res.status(201).json({
    data: await service.submit(organizationId, id, input),
    error: null,
  })
}

export async function listFormCustomerRequests(req: Request, res: Response) {
  const { organizationId, id } = requestFormParamsSchema.parse(req.params)
  const query = listFormCustomerRequestsQuerySchema.parse(req.query)
  const data = await service.listCustomerRequests(organizationId, id, query)

  res.json({
    data: {
      object: 'list',
      data,
      has_more: false,
      total_count: data.length,
      url: `/v1/organizations/${organizationId}/request-forms/${id}/requests`,
    },
    error: null,
  })
}

export async function listRequestFormSubmissions(
  req: Request,
  res: Response
) {
  const { organizationId, id } = requestFormParamsSchema.parse(req.params)
  const data = await service.listSubmissions(organizationId, id)

  res.json({
    data: {
      object: 'list',
      data,
      has_more: false,
      total_count: data.length,
      url: `/v1/organizations/${organizationId}/request-forms/${id}/submissions`,
    },
    error: null,
  })
}
