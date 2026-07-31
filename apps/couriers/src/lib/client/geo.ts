'use client'

import type { PlatformCountry, PlatformRegion } from '@876/core/platform'

import { request } from './request'

export const listCountries = () =>
  request<PlatformCountry[]>('/api/manage/geo/countries')

export const listRegions = (countryCode: string) =>
  request<PlatformRegion[]>(
    `/api/manage/geo/countries/${encodeURIComponent(countryCode)}/regions`
  )

export const geo = { listCountries, listRegions }
