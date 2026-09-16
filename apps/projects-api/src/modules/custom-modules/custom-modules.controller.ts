import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import { parseRoleKeysHeader } from './custom-modules.service.js'
import * as service from './custom-modules.service.js'
import {
  createLinkBodySchema,
  createModuleBodySchema,
  createModuleFieldBodySchema,
  createModuleStatusBodySchema,
  createRecordBodySchema,
  createWidgetBodySchema,
  fieldParamsSchema,
  linkParamsSchema,
  listRecordsQuerySchema,
  listWidgetsQuerySchema,
  moduleKeyParamsSchema,
  moduleParamsSchema,
  moduleReportQuerySchema,
  organizationParamsSchema,
  recordParamsSchema,
  reorderStatusesBodySchema,
  statusParamsSchema,
  updateModuleBodySchema,
  updateModuleFieldBodySchema,
  updateModuleStatusBodySchema,
  updateRecordBodySchema,
  updateWidgetBodySchema,
  widgetParamsSchema,
} from './custom-modules.schemas.js'

function roleKeys(req: Request): string[] {
  return parseRoleKeysHeader(req.header('x-app-role-keys'))
}

export async function listModules(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  return sendProjectsList(
    res,
    await service.listModules(params.organizationId),
    `/v1/organizations/${params.organizationId}/custom-modules`
  )
}

export async function createModule(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createModule(params.organizationId, createModuleBodySchema.parse(req.body)),
    201
  )
}

export async function retrieveModule(req: Request, res: Response) {
  const params = moduleParamsSchema.parse(req.params)
  return sendProjectsResult(res, await service.retrieveModule(params.organizationId, params.moduleId))
}

export async function retrieveModuleByKey(req: Request, res: Response) {
  const params = moduleKeyParamsSchema.parse(req.params)
  const resolved = await service.listModules(params.organizationId)
  if (resolved.error) return sendProjectsResult(res, resolved)
  const found = resolved.data.find((module) => module.key === params.moduleKey)
  if (!found) {
    const { getError } = await import('../../http/errors.js')
    return sendProjectsResult(res, { data: null, error: getError('projects/custom-module-not-found') }, 404)
  }
  return sendProjectsResult(res, { data: found, error: null })
}

export async function updateModule(req: Request, res: Response) {
  const params = moduleParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateModule(params.organizationId, params.moduleId, updateModuleBodySchema.parse(req.body))
  )
}

export async function removeModule(req: Request, res: Response) {
  const params = moduleParamsSchema.parse(req.params)
  return sendProjectsResult(res, await service.removeModule(params.organizationId, params.moduleId))
}

export async function listFields(req: Request, res: Response) {
  const params = moduleParamsSchema.parse(req.params)
  return sendProjectsList(
    res,
    await service.listModuleFields(params.organizationId, params.moduleId),
    `/v1/organizations/${params.organizationId}/custom-modules/${params.moduleId}/fields`
  )
}

export async function createField(req: Request, res: Response) {
  const params = moduleParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createModuleField(params.organizationId, params.moduleId, createModuleFieldBodySchema.parse(req.body)),
    201
  )
}

export async function updateField(req: Request, res: Response) {
  const params = fieldParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateModuleField(params.organizationId, params.moduleId, params.fieldId, updateModuleFieldBodySchema.parse(req.body))
  )
}

export async function removeField(req: Request, res: Response) {
  const params = fieldParamsSchema.parse(req.params)
  return sendProjectsResult(res, await service.removeModuleField(params.organizationId, params.moduleId, params.fieldId))
}

export async function listStatuses(req: Request, res: Response) {
  const params = moduleParamsSchema.parse(req.params)
  return sendProjectsList(
    res,
    await service.listModuleStatuses(params.organizationId, params.moduleId),
    `/v1/organizations/${params.organizationId}/custom-modules/${params.moduleId}/statuses`
  )
}

export async function createStatus(req: Request, res: Response) {
  const params = moduleParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createModuleStatus(params.organizationId, params.moduleId, createModuleStatusBodySchema.parse(req.body)),
    201
  )
}

export async function updateStatus(req: Request, res: Response) {
  const params = statusParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateModuleStatus(params.organizationId, params.moduleId, params.statusId, updateModuleStatusBodySchema.parse(req.body))
  )
}

export async function reorderStatuses(req: Request, res: Response) {
  const params = moduleParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.reorderModuleStatuses(params.organizationId, params.moduleId, reorderStatusesBodySchema.parse(req.body))
  )
}

export async function removeStatus(req: Request, res: Response) {
  const params = statusParamsSchema.parse(req.params)
  return sendProjectsResult(res, await service.removeModuleStatus(params.organizationId, params.moduleId, params.statusId))
}

export async function listRecords(req: Request, res: Response) {
  const params = moduleParamsSchema.parse(req.params)
  const query = listRecordsQuerySchema.parse(req.query)
  const result = await service.listRecords(params.organizationId, params.moduleId, query, roleKeys(req))
  if (result.error) return sendProjectsResult(res, result)
  return res.json({
    data: {
      object: 'list',
      data: result.data.items,
      has_more: result.data.hasMore,
      total_count: result.data.totalCount,
      url: `/v1/organizations/${params.organizationId}/custom-modules/${params.moduleId}/records`,
    },
    error: null,
  })
}

export async function createRecord(req: Request, res: Response) {
  const params = moduleParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createRecord(params.organizationId, params.moduleId, createRecordBodySchema.parse(req.body), roleKeys(req)),
    201
  )
}

export async function retrieveRecord(req: Request, res: Response) {
  const params = recordParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveRecord(params.organizationId, params.moduleId, params.recordId, roleKeys(req))
  )
}

export async function updateRecord(req: Request, res: Response) {
  const params = recordParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateRecord(params.organizationId, params.moduleId, params.recordId, updateRecordBodySchema.parse(req.body), roleKeys(req))
  )
}

export async function removeRecord(req: Request, res: Response) {
  const params = recordParamsSchema.parse(req.params)
  return sendProjectsResult(res, await service.removeRecord(params.organizationId, params.moduleId, params.recordId, roleKeys(req)))
}

export async function listLinks(req: Request, res: Response) {
  const params = recordParamsSchema.parse(req.params)
  return sendProjectsList(
    res,
    await service.listLinks(params.organizationId, params.moduleId, params.recordId, roleKeys(req)),
    `/v1/organizations/${params.organizationId}/custom-modules/${params.moduleId}/records/${params.recordId}/links`
  )
}

export async function createLink(req: Request, res: Response) {
  const params = recordParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createLink(params.organizationId, params.moduleId, params.recordId, createLinkBodySchema.parse(req.body), roleKeys(req)),
    201
  )
}

export async function removeLink(req: Request, res: Response) {
  const params = linkParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removeLink(params.organizationId, params.moduleId, params.recordId, params.linkId, roleKeys(req))
  )
}

export async function getStatusReport(req: Request, res: Response) {
  const params = moduleParamsSchema.parse(req.params)
  const query = moduleReportQuerySchema.parse(req.query)
  const result = await service.getStatusReport(params.organizationId, params.moduleId, query, roleKeys(req))
  if (result.error) return sendProjectsResult(res, result)
  if (query.format === 'csv') return res.status(200).type('text/csv').send(result.data.csv)
  return sendProjectsResult(res, { data: result.data.report, error: null })
}

export async function getFieldReport(req: Request, res: Response) {
  const params = moduleParamsSchema.parse(req.params)
  const query = moduleReportQuerySchema.parse(req.query)
  const result = await service.getFieldReport(params.organizationId, params.moduleId, query, roleKeys(req))
  if (result.error) return sendProjectsResult(res, result)
  if (query.format === 'csv') return res.status(200).type('text/csv').send(result.data.csv)
  return sendProjectsResult(res, { data: result.data.report, error: null })
}

export async function getCreatedReport(req: Request, res: Response) {
  const params = moduleParamsSchema.parse(req.params)
  const query = moduleReportQuerySchema.parse(req.query)
  const result = await service.getCreatedReport(params.organizationId, params.moduleId, query, roleKeys(req))
  if (result.error) return sendProjectsResult(res, result)
  if (query.format === 'csv') return res.status(200).type('text/csv').send(result.data.csv)
  return sendProjectsResult(res, { data: result.data.report, error: null })
}

export async function listWidgets(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = listWidgetsQuerySchema.parse(req.query)
  return sendProjectsList(
    res,
    await service.listWidgets(params.organizationId, query),
    `/v1/organizations/${params.organizationId}/dashboard-widgets`
  )
}

export async function createWidget(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createWidget(params.organizationId, createWidgetBodySchema.parse(req.body)),
    201
  )
}

export async function updateWidget(req: Request, res: Response) {
  const params = widgetParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateWidget(params.organizationId, params.widgetId, updateWidgetBodySchema.parse(req.body))
  )
}

export async function removeWidget(req: Request, res: Response) {
  const params = widgetParamsSchema.parse(req.params)
  return sendProjectsResult(res, await service.removeWidget(params.organizationId, params.widgetId))
}
