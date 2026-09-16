import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import * as service from './time.service.js'
import {
  approveTimesheetBodySchema,
  createTimeEntryBodySchema,
  createTimesheetBodySchema,
  currentTimerQuerySchema,
  deleteTimeEntryQuerySchema,
  listTimeEntriesQuerySchema,
  listTimesheetsQuerySchema,
  organizationParamsSchema,
  recallTimesheetBodySchema,
  rejectTimesheetBodySchema,
  startTimerBodySchema,
  stopTimerBodySchema,
  submitTimesheetBodySchema,
  timeEntryParamsSchema,
  timeSummaryQuerySchema,
  timesheetParamsSchema,
  updateTimeEntryBodySchema,
} from './time.schemas.js'

export async function listTimeEntries(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = listTimeEntriesQuerySchema.parse(req.query)
  return sendProjectsList(
    res,
    await service.listTimeEntries(params.organizationId, query),
    `/v1/organizations/${params.organizationId}/time-entries`
  )
}

export async function createTimeEntry(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createTimeEntry(
      params.organizationId,
      createTimeEntryBodySchema.parse(req.body)
    ),
    201
  )
}

export async function retrieveTimeEntry(req: Request, res: Response) {
  const params = timeEntryParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveTimeEntry(params.organizationId, params.timeEntryId)
  )
}

export async function updateTimeEntry(req: Request, res: Response) {
  const params = timeEntryParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateTimeEntry(
      params.organizationId,
      params.timeEntryId,
      updateTimeEntryBodySchema.parse(req.body)
    )
  )
}

export async function removeTimeEntry(req: Request, res: Response) {
  const params = timeEntryParamsSchema.parse(req.params)
  const query = deleteTimeEntryQuerySchema.parse(req.query)
  return sendProjectsResult(
    res,
    await service.removeTimeEntry(
      params.organizationId,
      params.timeEntryId,
      query.userId
    )
  )
}

export async function startTimer(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.startTimer(
      params.organizationId,
      startTimerBodySchema.parse(req.body)
    ),
    201
  )
}

export async function stopTimer(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.stopTimer(
      params.organizationId,
      stopTimerBodySchema.parse(req.body)
    )
  )
}

export async function currentTimer(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = currentTimerQuerySchema.parse(req.query)
  return sendProjectsResult(
    res,
    await service.currentTimer(params.organizationId, query.userId)
  )
}

export async function listTimesheets(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = listTimesheetsQuerySchema.parse(req.query)
  return sendProjectsList(
    res,
    await service.listTimesheets(params.organizationId, query),
    `/v1/organizations/${params.organizationId}/timesheets`
  )
}

export async function createTimesheet(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createTimesheet(
      params.organizationId,
      createTimesheetBodySchema.parse(req.body)
    ),
    201
  )
}

export async function retrieveTimesheet(req: Request, res: Response) {
  const params = timesheetParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveTimesheet(params.organizationId, params.timesheetId)
  )
}

export async function submitTimesheet(req: Request, res: Response) {
  const params = timesheetParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.submitTimesheet(
      params.organizationId,
      params.timesheetId,
      submitTimesheetBodySchema.parse(req.body)
    )
  )
}

export async function approveTimesheet(req: Request, res: Response) {
  const params = timesheetParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.approveTimesheet(
      params.organizationId,
      params.timesheetId,
      approveTimesheetBodySchema.parse(req.body)
    )
  )
}

export async function rejectTimesheet(req: Request, res: Response) {
  const params = timesheetParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.rejectTimesheet(
      params.organizationId,
      params.timesheetId,
      rejectTimesheetBodySchema.parse(req.body)
    )
  )
}

export async function recallTimesheet(req: Request, res: Response) {
  const params = timesheetParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.recallTimesheet(
      params.organizationId,
      params.timesheetId,
      recallTimesheetBodySchema.parse(req.body)
    )
  )
}

export async function listTimesheetEvents(req: Request, res: Response) {
  const params = timesheetParamsSchema.parse(req.params)
  return sendProjectsList(
    res,
    await service.listTimesheetEvents(
      params.organizationId,
      params.timesheetId
    ),
    `/v1/organizations/${params.organizationId}/timesheets/${params.timesheetId}/events`
  )
}

export async function getTimeSummary(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = timeSummaryQuerySchema.parse(req.query)
  return sendProjectsResult(
    res,
    await service.getTimeSummary(params.organizationId, query)
  )
}
