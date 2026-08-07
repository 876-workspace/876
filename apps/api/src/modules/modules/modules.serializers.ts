import { fromDbUnixSeconds } from '@/platform/timestamps'

import {
  MODULE_STATUSES,
  type ApplicationModule,
  type ModuleStatus,
} from './modules.schemas'

export type ModuleRow = {
  id: string
  appId: string
  key: string
  name: string
  description: string | null
  featureId: string | null
  status: string
  position: number
  createdAt: bigint
  updatedAt: bigint
  feature?: { slug: string } | null
}

function moduleStatus(value: string): ModuleStatus {
  return (MODULE_STATUSES as readonly string[]).includes(value)
    ? (value as ModuleStatus)
    : 'active'
}

/**
 * `feature_slug` is denormalized onto the resource so a Console list can show
 * which flag gates a module without a request per row.
 */
export function serializeModule(row: ModuleRow): ApplicationModule {
  return {
    object: 'application_module',
    id: row.id,
    app_id: row.appId,
    key: row.key,
    name: row.name,
    description: row.description,
    feature_id: row.featureId,
    feature_slug: row.feature?.slug ?? null,
    status: moduleStatus(row.status),
    position: row.position,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
