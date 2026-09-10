import 'server-only'

import { cache } from 'react'
import { workspace } from '@/lib/services/workspace'
import { collectCatalogPages } from './catalog-pages'

// Primitive arguments let plans, modules and feature views share one read per
// render. The next request reads current operator edits again.
export const listAppModules = cache((appId: string, includeArchived: boolean) =>
  workspace.modules.list(appId, { includeArchived })
)

export const listModuleFeatures = cache((appId: string) =>
  collectCatalogPages((startingAfter) =>
    workspace.features.list({
      appId,
      rootOnly: true,
      limit: 100,
      startingAfter,
    })
  )
)
