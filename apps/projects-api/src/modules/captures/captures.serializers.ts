import { fromDbUnixSeconds } from '../../platform/timestamps.js'

export type CaptureRow = {
  id: string
  tenantId: string
  title: string
  body: string | null
  status: 'inbox' | 'promoted' | 'discarded'
  source: 'mcp' | 'web' | 'mobile' | null
  createdBy: string
  projectId: string | null
  promotedIssueId: string | null
  createdAt: bigint | number
  updatedAt: bigint | number
}
export type SerializedCapture = {
  object: 'capture'
  id: string
  tenantId: string
  title: string
  body: string | null
  status: CaptureRow['status']
  source: CaptureRow['source']
  createdBy: string
  projectId: string | null
  promotedIssueId: string | null
  createdAt: number
  updatedAt: number
}
export function serializeCapture(row: CaptureRow): SerializedCapture {
  return {
    object: 'capture',
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    body: row.body,
    status: row.status,
    source: row.source,
    createdBy: row.createdBy,
    projectId: row.projectId,
    promotedIssueId: row.promotedIssueId,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}
