import type { Request, Response } from 'express'

import * as service from './requests.service.js'
import {
  createRequestBodySchema,
  createRequestNoteBodySchema,
  deleteRequestBodySchema,
  deleteRequestNoteBodySchema,
  listRequestNotesQuerySchema,
  listRequestsQuerySchema,
  organizationParamsSchema,
  requestNoteParamsSchema,
  requestParamsSchema,
  updateRequestBodySchema,
  updateRequestNoteBodySchema,
  taskParamsSchema,
  reminderParamsSchema,
  createTaskBodySchema,
  updateTaskBodySchema,
  createReminderBodySchema,
  updateReminderBodySchema,
  deleteNestedBodySchema,
} from './requests.schemas.js'
import * as tasks from './requests.tasks.service.js'

function notFound(res: Response) {
  return res.status(404).json({
    data: null,
    error: { code: 'crm/request-not-found', message: 'Request not found.' },
  })
}

export async function listRequests(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const query = listRequestsQuerySchema.parse(req.query)
  const data = await service.list(organizationId, query)

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

  res
    .status(201)
    .json({ data: await service.create(organizationId, input), error: null })
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
  const { organizationId, id: requestId } = requestParamsSchema.parse(
    req.params
  )
  const query = listRequestNotesQuerySchema.parse(req.query)
  const data = await service.listNotes(organizationId, requestId, {
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

export async function createRequestNote(req: Request, res: Response) {
  const { organizationId, id: requestId } = requestParamsSchema.parse(
    req.params
  )
  const input = createRequestNoteBodySchema.parse(req.body)

  res.status(201).json({
    data: await service.createNote(organizationId, requestId, input),
    error: null,
  })
}

export async function deleteRequestNote(req: Request, res: Response) {
  const {
    organizationId,
    id: requestId,
    noteId,
  } = requestNoteParamsSchema.parse(req.params)
  const input = deleteRequestNoteBodySchema.parse(req.body)
  const data = await service.removeNote(
    organizationId,
    requestId,
    noteId,
    input
  )
  if (!data) return notFound(res)

  res.json({ data, error: null })
}

export async function updateRequestNote(req: Request, res: Response) {
  const {
    organizationId,
    id: requestId,
    noteId,
  } = requestNoteParamsSchema.parse(req.params)
  const input = updateRequestNoteBodySchema.parse(req.body)
  const data = await service.updateNote(
    organizationId,
    requestId,
    noteId,
    input
  )
  if (!data) return notFound(res)

  res.json({ data, error: null })
}

const nestedNotFound = (res: Response, code: string, message: string) =>
  res.status(404).json({ data: null, error: { code, message } })
const nestedList = (res: Response, data: unknown[], url: string) =>
  res.json({
    data: {
      object: 'list',
      data,
      has_more: false,
      total_count: data.length,
      url,
    },
    error: null,
  })
export async function listTasks(req: Request, res: Response) {
  const p = requestParamsSchema.parse(req.params)
  nestedList(
    res,
    await tasks.tasks(p.organizationId, p.id),
    `/v1/organizations/${p.organizationId}/requests/${p.id}/tasks`
  )
}
export async function createTask(req: Request, res: Response) {
  const p = requestParamsSchema.parse(req.params)
  res.status(201).json({
    data: await tasks.createTask(
      p.organizationId,
      p.id,
      createTaskBodySchema.parse(req.body)
    ),
    error: null,
  })
}
export async function updateTask(req: Request, res: Response) {
  const p = taskParamsSchema.parse(req.params),
    d = await tasks.updateTask(
      p.organizationId,
      p.id,
      p.taskId,
      updateTaskBodySchema.parse(req.body)
    )
  if (!d)
    return nestedNotFound(res, 'crm/task-not-found', 'Request task not found.')
  res.json({ data: d, error: null })
}
export async function deleteTask(req: Request, res: Response) {
  const p = taskParamsSchema.parse(req.params),
    d = await tasks.removeTask(
      p.organizationId,
      p.id,
      p.taskId,
      deleteNestedBodySchema.parse(req.body).deletedBy
    )
  if (!d)
    return nestedNotFound(res, 'crm/task-not-found', 'Request task not found.')
  res.json({ data: d, error: null })
}
export async function listReminders(req: Request, res: Response) {
  const p = requestParamsSchema.parse(req.params)
  nestedList(
    res,
    await tasks.reminders(p.organizationId, p.id),
    `/v1/organizations/${p.organizationId}/requests/${p.id}/reminders`
  )
}
export async function createReminder(req: Request, res: Response) {
  const p = requestParamsSchema.parse(req.params)
  res.status(201).json({
    data: await tasks.createReminder(
      p.organizationId,
      p.id,
      createReminderBodySchema.parse(req.body)
    ),
    error: null,
  })
}
export async function updateReminder(req: Request, res: Response) {
  const p = reminderParamsSchema.parse(req.params),
    d = await tasks.updateReminder(
      p.organizationId,
      p.id,
      p.reminderId,
      updateReminderBodySchema.parse(req.body)
    )
  if (!d)
    return nestedNotFound(
      res,
      'crm/reminder-not-found',
      'Request reminder not found.'
    )
  res.json({ data: d, error: null })
}
export async function deleteReminder(req: Request, res: Response) {
  const p = reminderParamsSchema.parse(req.params),
    d = await tasks.removeReminder(
      p.organizationId,
      p.id,
      p.reminderId,
      deleteNestedBodySchema.parse(req.body).deletedBy
    )
  if (!d)
    return nestedNotFound(
      res,
      'crm/reminder-not-found',
      'Request reminder not found.'
    )
  res.json({ data: d, error: null })
}
