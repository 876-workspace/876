import type { Request, Response } from 'express'

import * as service from './notes.service.js'
import {
  createNoteBodySchema,
  deleteNoteBodySchema,
  listNotesQuerySchema,
  noteParamsSchema,
  requestParamsSchema,
  updateNoteBodySchema,
} from './notes.schemas.js'

function notFound(res: Response) {
  return res.status(404).json({
    data: null,
    error: {
      code: 'crm/request-note-not-found',
      message: 'Request note not found.',
    },
  })
}

export async function listNotes(req: Request, res: Response) {
  const { organizationId, id: requestId } = requestParamsSchema.parse(req.params)
  const query = listNotesQuerySchema.parse(req.query)
  const data = await service.list(organizationId, requestId, {
    viewerId: query.viewer_id,
    includePrivate: query.include_private,
  })

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

export async function createNote(req: Request, res: Response) {
  const { organizationId, id: requestId } = requestParamsSchema.parse(req.params)
  const input = createNoteBodySchema.parse(req.body)

  res.status(201).json({
    data: await service.create(organizationId, requestId, input),
    error: null,
  })
}

export async function updateNote(req: Request, res: Response) {
  const { organizationId, id: requestId, noteId } = noteParamsSchema.parse(req.params)
  const input = updateNoteBodySchema.parse(req.body)
  const data = await service.update(organizationId, requestId, noteId, input)
  if (!data) return notFound(res)

  res.json({ data, error: null })
}

export async function deleteNote(req: Request, res: Response) {
  const { organizationId, id: requestId, noteId } = noteParamsSchema.parse(req.params)
  const input = deleteNoteBodySchema.parse(req.body)
  const data = await service.remove(organizationId, requestId, noteId, input)
  if (!data) return notFound(res)

  res.json({ data, error: null })
}
