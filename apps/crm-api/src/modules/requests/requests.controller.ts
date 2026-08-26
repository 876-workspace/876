import type { Request, Response } from 'express'

import * as service from './requests.service.js'
import {
  createRequestBodySchema,
  createRequestNoteBodySchema,
  deleteRequestBodySchema,
  deleteRequestNoteBodySchema,
  organizationParamsSchema,
  requestNoteParamsSchema,
  requestParamsSchema,
  updateRequestBodySchema,
  updateRequestNoteBodySchema,
} from './requests.schemas.js'

function notFound(res: Response) {
  return res.status(404).json({
    data: null,
    error: { code: 'crm/request-not-found', message: 'Request not found.' },
  })
}

export async function listRequests(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const data = await service.list(organizationId)

  res.json({
    data: {
      object: 'list',
      data,
      has_more: false,
      total_count: data.length,
      url: `/v1/organizations/${organizationId}/requests`,
    },
    error: null,
  })
}

export async function retrieveRequest(req: Request, res: Response) {
  const { organizationId, id } = requestParamsSchema.parse(req.params)
  const data = await service.retrieve(organizationId, id)
  if (!data) return notFound(res)

  res.json({ data, error: null })
}

export async function createRequest(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const input = createRequestBodySchema.parse(req.body)

  res.status(201).json({ data: await service.create(organizationId, input), error: null })
}

export async function updateRequest(req: Request, res: Response) {
  const { organizationId, id } = requestParamsSchema.parse(req.params)
  const input = updateRequestBodySchema.parse(req.body)
  const data = await service.update(organizationId, id, input)
  if (!data) return notFound(res)

  res.json({ data, error: null })
}

export async function deleteRequest(req: Request, res: Response) {
  const { organizationId, id } = requestParamsSchema.parse(req.params)
  const input = deleteRequestBodySchema.parse(req.body)
  const data = await service.remove(organizationId, id, input)
  if (!data) return notFound(res)

  res.json({ data, error: null })
}

export async function listRequestNotes(req: Request, res: Response) {
  const { organizationId, id: requestId } = requestParamsSchema.parse(req.params)
  const data = await service.listNotes(organizationId, requestId)

  res.json({
    data: {
      object: 'list',
      data,
      has_more: false,
      total_count: data.length,
      url: `/v1/organizations/${organizationId}/requests/${requestId}/notes`,
    },
    error: null,
  })
}

export async function createRequestNote(req: Request, res: Response) {
  const { organizationId, id: requestId } = requestParamsSchema.parse(req.params)
  const input = createRequestNoteBodySchema.parse(req.body)

  res.status(201).json({
    data: await service.createNote(organizationId, requestId, input),
    error: null,
  })
}

export async function deleteRequestNote(req: Request, res: Response) {
  const { organizationId, id: requestId, noteId } = requestNoteParamsSchema.parse(req.params)
  const input = deleteRequestNoteBodySchema.parse(req.body)
  const data = await service.removeNote(organizationId, requestId, noteId, input)
  if (!data) return notFound(res)

  res.json({ data, error: null })
}

export async function updateRequestNote(req: Request, res: Response) {
  const { organizationId, id: requestId, noteId } = requestNoteParamsSchema.parse(req.params)
  const input = updateRequestNoteBodySchema.parse(req.body)
  const data = await service.updateNote(organizationId, requestId, noteId, input)
  if (!data) return notFound(res)

  res.json({ data, error: null })
}
