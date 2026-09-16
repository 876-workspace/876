import { fromDbUnixSeconds } from '../../platform/timestamps.js'

export type AttachmentLinkRow = {
  id: string
  tenantId: string
  projectId: string
  issueId: string | null
  milestoneId: string | null
  url: string
  name: string | null
  clientVisible: boolean
  createdBy: string | null
  createdAt: bigint | number
  updatedAt: bigint | number
}

export type SerializedAttachmentLink = {
  object: 'projects.attachment-link'
  id: string
  tenantId: string
  projectId: string
  issueId: string | null
  milestoneId: string | null
  url: string
  name: string | null
  clientVisible: boolean
  createdBy: string | null
  createdAt: number
  updatedAt: number
}

export type SerializedAttachmentTombstone = {
  object: 'projects.attachment-link'
  id: string
  deleted: true
}

export function serializeAttachmentLink(
  row: AttachmentLinkRow
): SerializedAttachmentLink {
  return {
    object: 'projects.attachment-link',
    id: row.id,
    tenantId: row.tenantId,
    projectId: row.projectId,
    issueId: row.issueId,
    milestoneId: row.milestoneId,
    url: row.url,
    name: row.name,
    clientVisible: row.clientVisible,
    createdBy: row.createdBy,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}
