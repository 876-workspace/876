'use client'

import type { Branding, BrandingUpdateParams } from '@876/billing'

import { request } from './request'

export const retrieve = () =>
  request<Branding>('/api/branding', {
    method: 'GET',
  })

export const update = (params: BrandingUpdateParams) =>
  request<Branding>('/api/branding', {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const branding = { retrieve, update }
