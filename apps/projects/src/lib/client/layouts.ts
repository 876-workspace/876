'use client'

import type {
  Layout,
  LayoutCondition,
  LayoutEffect,
  LayoutField,
  LayoutRule,
  LayoutSection,
} from '@876/projects/contracts'

import { request } from './request'

import type { CreateLayoutParams, UpdateLayoutParams } from '@/types/layouts'

export type {
  LayoutCondition,
  LayoutEffect,
  LayoutField,
  LayoutRule,
  LayoutSection,
}

/**
 * Layout writes go through this app's own routes, which resolve the
 * organization and the acting user from the sealed session: the browser never
 * names either. The body carries the editor's `definition` verbatim; the
 * route flattens it onto the service call.
 */
export const layoutsClient = {
  create(params: CreateLayoutParams) {
    return request<Layout>('/api/layouts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(id: string, params: UpdateLayoutParams) {
    return request<Layout>(`/api/layouts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  delete(id: string) {
    return request<{ object: string; id: string; deleted: true }>(
      `/api/layouts/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    )
  },
  makeDefault(id: string) {
    return request<Layout>(
      `/api/layouts/${encodeURIComponent(id)}/make-default`,
      { method: 'POST' }
    )
  },
}
