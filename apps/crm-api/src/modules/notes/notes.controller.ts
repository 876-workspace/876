import type { Request, Response } from 'express'

import {
  sendCrmError,
  sendCrmList,
  sendCrmResult,
} from '../../http/result.js'
import * as service from './notes.service.js'
import {
  createNoteBodySchema,
  deleteNoteBodySchema,
  listNotesQuerySchema,
  noteParamsSchema,
  requestParamsSchema,
  updateNoteBodySchema,
} from './notes.schemas.js'

export async function listNotes(req: Request, res: Response) {
  const { organizationId, id: requestId } = requestParamsSchema.parse(req.params)
  const query = listNotesQuerySchema.parse(req.query)
  const result = await service.list(organizationId, requestId, {
    viewerId: query.viewer_id,
    includePrivate: query.include_private,
  })
  return sendCrmList(
    res,
    result,
    `/v1/organizations/${organizationId}/requests/${requestId}/notes`
  )
}

export async function createNote(req: Request, res: Response) {
  const { organizationId, id: requestId } = requestParamsSchema.parse(req.params)
  const input = createNoteBodySchema.parse(req.body)
  const result = await service.create(organizationId, requestId, input)
  return sendCrmResult(res, result, 201)
}

export async function updateNote(req: Request, res: Response) {
  const { organizationId, id: requestId, noteId } = noteParamsSchema.parse(req.params)
  const input = updateNoteBodySchema.parse(req.body)
  const result = await service.update(organizationId, requestId, noteId, input)
  if (!result) return sendCrmError(res, 'crm/request-note-not-found')
  return sendCrmResult(res, result)
}

export async function deleteNote(req: Request, res: Response) {
  const { organizationId, id: requestId, noteId } = noteParamsSchema.parse(req.params)
  const input = deleteNoteBodySchema.parse(req.body)
  const result = await service.remove(organizationId, requestId, noteId, input)
  if (!result) return sendCrmError(res, 'crm/request-note-not-found')
  return sendCrmResult(res, result)
}
