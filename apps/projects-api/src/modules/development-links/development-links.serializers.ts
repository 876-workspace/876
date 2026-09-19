import { fromDbUnixSeconds } from '../../platform/timestamps.js'

export type DevelopmentLinkRow = {
  id: string
  tenantId: string
  workItemId: string
  kind: string
  url: string
  label: string | null
  externalId: string
  state: string | null
  createdAt: bigint | number
  updatedAt: bigint | number
}

export type SerializedDevelopmentLink = {
  object: 'development-link'
  id: string
  tenantId: string
  workItemId: string
  kind: string
  url: string
  label: string | null
  externalId: string
  state: string | null
  createdAt: number
  updatedAt: number
}

export function serializeDevelopmentLink(
  row: DevelopmentLinkRow
): SerializedDevelopmentLink {
  return {
    object: 'development-link',
    id: row.id,
    tenantId: row.tenantId,
    workItemId: row.workItemId,
    kind: row.kind,
    url: row.url,
    label: row.label,
    externalId: row.externalId,
    state: row.state,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}
