import { cache } from 'react'

import { $876 } from '@/lib/876'

export const resolveApp = cache(async (slug: string) => {
  const appSlug = slug
  // Resolve by the real stored slug across ALL first-party kinds
  // (internal/platform/product) — not just `internal`, which is why
  // /apps/876-couriers, /apps/876-enterprise, etc. previously 404'd. The
  // detail layout gates commercial tabs by `app_kind`, so no kind filter here.
  const { data: list } = await $876.apps.list({
    limit: 100,
    clientType: 'public',
  })
  return list?.data.find((a) => a.slug === appSlug) ?? null
})

export const resolveProduct = cache(async (appId: string, slugOrId: string) => {
  const { data } = await $876.products.list({ appId })
  return (
    data?.data.find(
      (product) => product.id === slugOrId || product.slug === slugOrId
    ) ?? null
  )
})
