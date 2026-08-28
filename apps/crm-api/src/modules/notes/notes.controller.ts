import { isError, toAppError } from '@876/core'
import type { Request, Response } from 'express'

import { sendCrmError, sendCrmResult } from '../../http/result.js'
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
  if (isError(result))
    return res
      .status(result.httpStatus)
      .json({ data: null, error: toAppError(result) })

  return res.json({
    data: {
      object: 'list',
      data: result,
      has_more: false,
      total_count: result.length,
      url: `/v1/organizations/${organizationId}/requests/${requestId}/notes`,
    },
    error: null,
  })
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
