'use client'

import type {
  ReportPreferences,
  ReportPreferencesUpdateParams,
} from '@876/billing'

import { request } from './request'

export const retrieve = () =>
  request<ReportPreferences>('/api/v1/report-preferences', {
    method: 'GET',
  })

export const update = (params: ReportPreferencesUpdateParams) =>
  request<ReportPreferences>('/api/v1/report-preferences', {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const reportPreferences = { retrieve, update }
