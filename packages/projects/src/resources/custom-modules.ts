import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  customModuleFieldListSchema,
  customModuleFieldReportSchema,
  customModuleFieldSchema,
  customModuleLinkListSchema,
  customModuleLinkSchema,
  customModuleListSchema,
  customModuleCreatedReportSchema,
  customModuleSchema,
  customModuleStatusListSchema,
  customModuleStatusReportSchema,
  customModuleStatusSchema,
  customRecordListSchema,
  customRecordSchema,
  dashboardWidgetListSchema,
  dashboardWidgetSchema,
  deletedSchema,
  type CreateCustomModuleFieldInput,
  type CreateCustomModuleInput,
  type CreateCustomModuleLinkInput,
  type CreateCustomModuleStatusInput,
  type CreateCustomRecordInput,
  type CreateDashboardWidgetInput,
  type GetCustomModuleReportQuery,
  type ListCustomRecordsQuery,
  type ListDashboardWidgetsQuery,
  type RequestOptions,
  type Result,
  type UpdateCustomModuleFieldInput,
  type UpdateCustomModuleInput,
  type UpdateCustomModuleStatusInput,
  type UpdateCustomRecordInput,
  type UpdateDashboardWidgetInput,
  type CustomModuleCreatedReport,
  type CustomModuleFieldReport,
  type CustomModuleStatusReport,
} from '../types'

function modulesRoot(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/custom-modules`
}

function widgetsRoot(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/dashboard-widgets`
}

async function requestText(
  runtime: Runtime,
  path: string,
  signal?: AbortSignal
): Promise<Result<string>> {
  if (!runtime.internalKey)
    return {
      data: null,
      error: {
        code: 'projects/not-configured',
        message: 'The Projects client is not configured.',
      },
    }
  const response = await runtime.fetch(`${runtime.baseUrl}${path}`, {
    method: 'GET',
    headers: {
      'x-internal-key': runtime.internalKey,
      ...(runtime.requestId ? { 'x-request-id': runtime.requestId } : {}),
    },
    signal,
  })
  if (!response.ok) {
    try {
      const payload = (await response.json()) as {
        error?: { code?: string; message?: string } | null
      }
      if (payload?.error?.code)
        return {
          data: null,
          error: {
            code: payload.error.code,
            message:
              payload.error.message ?? 'The Projects service returned an error.',
          },
        }
    } catch {
      // Fall through to the generic invalid-response error below.
    }
    return {
      data: null,
      error: {
        code: 'projects/invalid-response',
        message: 'The Projects service returned an invalid response.',
      },
    }
  }
  return { data: await response.text(), error: null }
}

function toRecordsQuery(query: ListCustomRecordsQuery): string {
  const search = new URLSearchParams()
  if (query.limit !== undefined) search.set('limit', String(query.limit))
  if (query.startingAfter) search.set('startingAfter', query.startingAfter)
  if (query.endingBefore) search.set('endingBefore', query.endingBefore)
  if (query.status) search.set('status', query.status)
  if (query.projectId) search.set('projectId', query.projectId)
  if (query.q) search.set('q', query.q)
  if (query.fieldKey) search.set('fieldKey', query.fieldKey)
  if (query.fieldValue) search.set('fieldValue', query.fieldValue)
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

function toReportQuery(query: GetCustomModuleReportQuery): string {
  const search = new URLSearchParams()
  if (query.from !== undefined) search.set('from', String(query.from))
  if (query.to !== undefined) search.set('to', String(query.to))
  if (query.fieldKey) search.set('fieldKey', query.fieldKey)
  if (query.format !== undefined) search.set('format', query.format)
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

function toWidgetsQuery(query: ListDashboardWidgetsQuery): string {
  const search = new URLSearchParams()
  if (query.moduleId) search.set('moduleId', query.moduleId)
  if (query.userId) search.set('userId', query.userId)
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function createCustomModulesResource(runtime: Runtime) {
  async function statusReport(
    organizationId: string,
    moduleId: string,
    query: GetCustomModuleReportQuery & RequestOptions & { format: 'csv' }
  ): Promise<Result<string>>
  async function statusReport(
    organizationId: string,
    moduleId: string,
    query?: GetCustomModuleReportQuery & RequestOptions
  ): Promise<Result<CustomModuleStatusReport>>
  async function statusReport(
    organizationId: string,
    moduleId: string,
    query: GetCustomModuleReportQuery & RequestOptions = {}
  ): Promise<Result<CustomModuleStatusReport | string>> {
    const { signal, ...params } = query
    const path = `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/reports/by-status${toReportQuery(params)}`
    if (params.format === 'csv') return requestText(runtime, path, signal)
    return request(
      runtime,
      {
        method: 'GET',
        path,
        signal,
      },
      customModuleStatusReportSchema
    )
  }
  async function fieldReport(
    organizationId: string,
    moduleId: string,
    query: GetCustomModuleReportQuery & RequestOptions & { format: 'csv' }
  ): Promise<Result<string>>
  async function fieldReport(
    organizationId: string,
    moduleId: string,
    query?: GetCustomModuleReportQuery & RequestOptions
  ): Promise<Result<CustomModuleFieldReport>>
  async function fieldReport(
    organizationId: string,
    moduleId: string,
    query: GetCustomModuleReportQuery & RequestOptions = {}
  ): Promise<Result<CustomModuleFieldReport | string>> {
    const { signal, ...params } = query
    const path = `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/reports/by-field${toReportQuery(params)}`
    if (params.format === 'csv') return requestText(runtime, path, signal)
    return request(
      runtime,
      {
        method: 'GET',
        path,
        signal,
      },
      customModuleFieldReportSchema
    )
  }
  async function createdReport(
    organizationId: string,
    moduleId: string,
    query: GetCustomModuleReportQuery & RequestOptions & { format: 'csv' }
  ): Promise<Result<string>>
  async function createdReport(
    organizationId: string,
    moduleId: string,
    query?: GetCustomModuleReportQuery & RequestOptions
  ): Promise<Result<CustomModuleCreatedReport>>
  async function createdReport(
    organizationId: string,
    moduleId: string,
    query: GetCustomModuleReportQuery & RequestOptions = {}
  ): Promise<Result<CustomModuleCreatedReport | string>> {
    const { signal, ...params } = query
    const path = `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/reports/created${toReportQuery(params)}`
    if (params.format === 'csv') return requestText(runtime, path, signal)
    return request(
      runtime,
      {
        method: 'GET',
        path,
        signal,
      },
      customModuleCreatedReportSchema
    )
  }
  return {
    listModules(organizationId: string, options: RequestOptions = {}) {
      return request(runtime, { method: 'GET', path: modulesRoot(organizationId), signal: options.signal }, customModuleListSchema)
    },
    createModule(organizationId: string, input: CreateCustomModuleInput, options: RequestOptions = {}) {
      return request(runtime, { method: 'POST', path: modulesRoot(organizationId), body: input, signal: options.signal }, customModuleSchema)
    },
    retrieveModule(organizationId: string, moduleId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        { method: 'GET', path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}`, signal: options.signal },
        customModuleSchema
      )
    },
    updateModule(organizationId: string, moduleId: string, input: UpdateCustomModuleInput, options: RequestOptions = {}) {
      return request(
        runtime,
        { method: 'PATCH', path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}`, body: input, signal: options.signal },
        customModuleSchema
      )
    },
    deleteModule(organizationId: string, moduleId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        { method: 'DELETE', path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}`, signal: options.signal },
        deletedSchema
      )
    },
    listFields(organizationId: string, moduleId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        { method: 'GET', path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/fields`, signal: options.signal },
        customModuleFieldListSchema
      )
    },
    createField(organizationId: string, moduleId: string, input: CreateCustomModuleFieldInput, options: RequestOptions = {}) {
      return request(
        runtime,
        { method: 'POST', path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/fields`, body: input, signal: options.signal },
        customModuleFieldSchema
      )
    },
    updateField(
      organizationId: string,
      moduleId: string,
      fieldId: string,
      input: UpdateCustomModuleFieldInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/fields/${encodeURIComponent(fieldId)}`,
          body: input,
          signal: options.signal,
        },
        customModuleFieldSchema
      )
    },
    deleteField(organizationId: string, moduleId: string, fieldId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/fields/${encodeURIComponent(fieldId)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
    listStatuses(organizationId: string, moduleId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        { method: 'GET', path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/statuses`, signal: options.signal },
        customModuleStatusListSchema
      )
    },
    createStatus(organizationId: string, moduleId: string, input: CreateCustomModuleStatusInput, options: RequestOptions = {}) {
      return request(
        runtime,
        { method: 'POST', path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/statuses`, body: input, signal: options.signal },
        customModuleStatusSchema
      )
    },
    updateStatus(
      organizationId: string,
      moduleId: string,
      statusId: string,
      input: UpdateCustomModuleStatusInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/statuses/${encodeURIComponent(statusId)}`,
          body: input,
          signal: options.signal,
        },
        customModuleStatusSchema
      )
    },
    reorderStatuses(organizationId: string, moduleId: string, orderedIds: string[], options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/statuses/reorder`,
          body: { orderedIds },
          signal: options.signal,
        },
        customModuleStatusListSchema
      )
    },
    deleteStatus(organizationId: string, moduleId: string, statusId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/statuses/${encodeURIComponent(statusId)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
    listRecords(organizationId: string, moduleId: string, query: ListCustomRecordsQuery & RequestOptions = {}) {
      const { signal, ...params } = query
      return request(
        runtime,
        { method: 'GET', path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/records${toRecordsQuery(params)}`, signal },
        customRecordListSchema
      )
    },
    createRecord(organizationId: string, moduleId: string, input: CreateCustomRecordInput, options: RequestOptions = {}) {
      return request(
        runtime,
        { method: 'POST', path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/records`, body: input, signal: options.signal },
        customRecordSchema
      )
    },
    retrieveRecord(organizationId: string, moduleId: string, recordId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/records/${encodeURIComponent(recordId)}`,
          signal: options.signal,
        },
        customRecordSchema
      )
    },
    updateRecord(
      organizationId: string,
      moduleId: string,
      recordId: string,
      input: UpdateCustomRecordInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/records/${encodeURIComponent(recordId)}`,
          body: input,
          signal: options.signal,
        },
        customRecordSchema
      )
    },
    deleteRecord(organizationId: string, moduleId: string, recordId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/records/${encodeURIComponent(recordId)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
    listLinks(organizationId: string, moduleId: string, recordId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/records/${encodeURIComponent(recordId)}/links`,
          signal: options.signal,
        },
        customModuleLinkListSchema
      )
    },
    createLink(
      organizationId: string,
      moduleId: string,
      recordId: string,
      input: CreateCustomModuleLinkInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/records/${encodeURIComponent(recordId)}/links`,
          body: input,
          signal: options.signal,
        },
        customModuleLinkSchema
      )
    },
    deleteLink(organizationId: string, moduleId: string, recordId: string, linkId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${modulesRoot(organizationId)}/${encodeURIComponent(moduleId)}/records/${encodeURIComponent(recordId)}/links/${encodeURIComponent(linkId)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
    statusReport,
    fieldReport,
    createdReport,
    listWidgets(organizationId: string, query: ListDashboardWidgetsQuery & RequestOptions = {}) {
      const { signal, ...params } = query
      return request(runtime, { method: 'GET', path: `${widgetsRoot(organizationId)}${toWidgetsQuery(params)}`, signal }, dashboardWidgetListSchema)
    },
    createWidget(organizationId: string, input: CreateDashboardWidgetInput, options: RequestOptions = {}) {
      return request(runtime, { method: 'POST', path: widgetsRoot(organizationId), body: input, signal: options.signal }, dashboardWidgetSchema)
    },
    updateWidget(organizationId: string, widgetId: string, input: UpdateDashboardWidgetInput, options: RequestOptions = {}) {
      return request(
        runtime,
        { method: 'PATCH', path: `${widgetsRoot(organizationId)}/${encodeURIComponent(widgetId)}`, body: input, signal: options.signal },
        dashboardWidgetSchema
      )
    },
    deleteWidget(organizationId: string, widgetId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        { method: 'DELETE', path: `${widgetsRoot(organizationId)}/${encodeURIComponent(widgetId)}`, signal: options.signal },
        deletedSchema
      )
    },
  }
}
