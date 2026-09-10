import 'server-only'

import { cache } from 'react'
import { workspace } from '@/lib/services/workspace'

export const getProvisioningCatalog = cache(
  (targetType: 'application' | 'finance', targetKey: string) =>
    workspace.provisioning.retrieveCatalog(targetType, targetKey)
)

export const getProvisioningReferenceData = cache(async () => {
  const [currencies, languages] = await Promise.all([
    workspace.geo.listCurrencies(),
    workspace.geo.listLanguages(),
  ])
  return { currencies, languages }
})
