import { cache } from 'react'

import { $876 } from '@/lib/876'
import { listConsoleApps } from '@/lib/apps-catalog'

export const resolveApp = cache(async (slug: string) => {
  // Resolve by the real stored slug across ALL first-party kinds
  // (internal/platform/product) — not just `internal`, which is why
  // /apps/876-couriers, /apps/876-enterprise, etc. previously 404'd. The
  // detail layout gates commercial tabs by `app_kind`, so no kind filter here.
  //
  // Shares the per-request catalog with the shell's feature-flag resolution,
  // which was issuing the identical list call on the same render.
  const apps = await listConsoleApps()
  return apps?.find((a) => a.slug === slug) ?? null
})

export const resolveProduct = cache(async (appId: string, slugOrId: string) => {
  const { data } = await $876.products.list({ appId })
  return (
    data?.data.find(
      (product) => product.id === slugOrId || product.slug === slugOrId
    ) ?? null
  )
})
