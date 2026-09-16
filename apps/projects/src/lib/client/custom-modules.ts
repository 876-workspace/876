'use client'

import type {
  CustomModule,
  CustomModuleField,
  CustomModuleLink,
  CustomModuleStatus,
  CustomRecord,
  DashboardWidget,
} from '@876/projects/contracts'

import { request } from './request'

type ListResponse<T> = {
  object: string
  data: T[]
  has_more: boolean
  url: string
  total_count: number | null
}

function modulePath(moduleId: string): string {
  return `/api/custom-modules/${encodeURIComponent(moduleId)}`
}

/**
 * Custom-module writes go through this app's own routes, which resolve the
 * organization, the acting user, and the caller's role keys from the sealed
 * session: the browser never names any of them.
 */
export const customModulesClient = {
  list() {
    return request<ListResponse<CustomModule>>('/api/custom-modules')
  },
  create(params: {
    scope: 'org' | 'project'
    projectId?: string | null
    key: string
    singularName: string
    pluralName: string
    icon?: string | null
    restrictedToRoleKeys?: string[]
  }) {
    return request<CustomModule>('/api/custom-modules', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(
    moduleId: string,
    params: {
      singularName?: string
      pluralName?: string
      icon?: string | null
      restrictedToRoleKeys?: string[] | null
    }
  ) {
    return request<CustomModule>(modulePath(moduleId), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  remove(moduleId: string) {
    return request<{ object: string; id: string; deleted: true }>(modulePath(moduleId), {
      method: 'DELETE',
    })
  },
}

export const customModuleFieldsClient = {
  create(
    moduleId: string,
    params: {
      key: string
      label: string
      fieldType: string
      options?: { key: string; label: string }[]
      required?: boolean
      position?: number
    }
  ) {
    return request<CustomModuleField>(`${modulePath(moduleId)}/fields`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(
    moduleId: string,
    fieldId: string,
    params: {
      label?: string
      fieldType?: string
      options?: { key: string; label: string }[]
      required?: boolean
      position?: number
    }
  ) {
    return request<CustomModuleField>(
      `${modulePath(moduleId)}/fields/${encodeURIComponent(fieldId)}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
  remove(moduleId: string, fieldId: string) {
    return request<{ object: string; id: string; deleted: true }>(
      `${modulePath(moduleId)}/fields/${encodeURIComponent(fieldId)}`,
      { method: 'DELETE' }
    )
  },
}

export const customModuleStatusesClient = {
  create(
    moduleId: string,
    params: { key: string; label: string; category: 'open' | 'in-progress' | 'done' }
  ) {
    return request<CustomModuleStatus>(`${modulePath(moduleId)}/statuses`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  replace(
    moduleId: string,
    statuses: { key: string; label: string; category: 'open' | 'in-progress' | 'done' }[]
  ) {
    return request<CustomModuleStatus[]>(`${modulePath(moduleId)}/statuses`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ statuses }),
    })
  },
  remove(moduleId: string, statusId: string) {
    return request<{ object: string; id: string; deleted: true }>(
      `${modulePath(moduleId)}/statuses/${encodeURIComponent(statusId)}`,
      { method: 'DELETE' }
    )
  },
}

export const customRecordsClient = {
  create(
    moduleId: string,
    params: {
      projectId?: string | null
      title: string
      statusKey?: string
      fields?: { key: string; value: string | number | boolean | string[] | null }[]
    }
  ) {
    return request<CustomRecord>(`${modulePath(moduleId)}/records`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(
    moduleId: string,
    recordId: string,
    params: {
      projectId?: string | null
      title?: string
      statusKey?: string
      fields?: { key: string; value: string | number | boolean | string[] | null }[]
    }
  ) {
    return request<CustomRecord>(
      `${modulePath(moduleId)}/records/${encodeURIComponent(recordId)}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
  remove(moduleId: string, recordId: string) {
    return request<{ object: string; id: string; deleted: true }>(
      `${modulePath(moduleId)}/records/${encodeURIComponent(recordId)}`,
      { method: 'DELETE' }
    )
  },
}

export const customModuleLinksClient = {
  create(
    moduleId: string,
    recordId: string,
    params: { targetType: 'record' | 'work-item' | 'project' | 'phase'; targetId: string; relation: string }
  ) {
    return request<CustomModuleLink>(
      `${modulePath(moduleId)}/records/${encodeURIComponent(recordId)}/links`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
  remove(moduleId: string, recordId: string, linkId: string) {
    return request<{ object: string; id: string; deleted: true }>(
      `${modulePath(moduleId)}/records/${encodeURIComponent(recordId)}/links/${encodeURIComponent(linkId)}`,
      { method: 'DELETE' }
    )
  },
}

export const dashboardWidgetsClient = {
  list() {
    return request<ListResponse<DashboardWidget>>('/api/dashboard-widgets')
  },
  create(params: {
    kind: 'record-count' | 'status-breakdown' | 'recent-records'
    moduleId: string
    userId?: string | null
    config?: Record<string, unknown>
    position?: number
  }) {
    return request<DashboardWidget>('/api/dashboard-widgets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(
    widgetId: string,
    params: {
      kind?: 'record-count' | 'status-breakdown' | 'recent-records'
      userId?: string | null
      config?: Record<string, unknown>
      position?: number
    }
  ) {
    return request<DashboardWidget>(`/api/dashboard-widgets/${encodeURIComponent(widgetId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  remove(widgetId: string) {
    return request<{ object: string; id: string; deleted: true }>(
      `/api/dashboard-widgets/${encodeURIComponent(widgetId)}`,
      { method: 'DELETE' }
    )
  },
}
