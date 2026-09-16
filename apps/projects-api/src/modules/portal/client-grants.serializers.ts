import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '../../platform/timestamps.js'

export type ClientGrantRow = {
  id: string
  tenantId: string
  projectId: string
  userId: string
  allowComments: boolean
  allowDiscussions: boolean
  allowFiles: boolean
  allowTime: boolean
  allowInvoices: boolean
  allowWiki: boolean
  invitedBy: string | null
  revokedAt: bigint | number | null
  createdAt: bigint | number
  updatedAt: bigint | number
}

export type SerializedClientGrant = {
  object: 'projects.client-grant'
  id: string
  tenantId: string
  projectId: string
  userId: string
  allowComments: boolean
  allowDiscussions: boolean
  allowFiles: boolean
  allowTime: boolean
  allowInvoices: boolean
  allowWiki: boolean
  invitedBy: string | null
  revokedAt: number | null
  createdAt: number
  updatedAt: number
}

export function serializeClientGrant(row: ClientGrantRow): SerializedClientGrant {
  return {
    object: 'projects.client-grant',
    id: row.id,
    tenantId: row.tenantId,
    projectId: row.projectId,
    userId: row.userId,
    allowComments: row.allowComments,
    allowDiscussions: row.allowDiscussions,
    allowFiles: row.allowFiles,
    allowTime: row.allowTime,
    allowInvoices: row.allowInvoices,
    allowWiki: row.allowWiki,
    invitedBy: row.invitedBy,
    revokedAt: nullableFromDbUnixSeconds(row.revokedAt),
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}
