import { z } from 'zod'

export const attachmentResourceTypes = [
  'project',
  'milestone',
  'task-list',
  'issue',
  'comment',
] as const

export type AttachmentResourceType = (typeof attachmentResourceTypes)[number]

export const ATTACHMENT_RELATION = 'attachment'

export type AttachmentCaller = {
  sourceAppId: string
  actorUserId: string
  actorOrgId: string
}

export type AttachmentResourceRef = {
  resourceType: AttachmentResourceType
  resourceId: string
}

export type AttachmentUploadSession = {
  sessionId: string
  fileId: string
  uploadUrl: string
  method: 'PUT'
  headers: { 'Content-Type': string; 'Content-Length': string }
  expiresAt: number
}

export type AttachmentLinkRef = {
  linkId: string
  fileId: string
}

export type AttachmentLinksError = {
  code: string
  message: string
  status: 400 | 404 | 502
}

export const attachmentResourceRefSchema = z.strictObject({
  resourceType: z.enum(attachmentResourceTypes),
  resourceId: z.string().trim().min(1),
})

export const attachmentUploadSessionRequestSchema =
  attachmentResourceRefSchema.extend({
    fileName: z.string().trim().min(1),
    contentType: z.string().trim().min(1),
    sizeBytes: z.number().int().positive(),
  })

export const attachmentCompleteRequestSchema =
  attachmentResourceRefSchema.extend({
    sessionId: z.string().trim().min(1),
  })

export const attachmentLinkRequestSchema = attachmentResourceRefSchema.extend({
  fileId: z
    .string()
    .trim()
    .regex(/^file_[A-Za-z0-9_-]+$/),
})

export type CreateIssueRelationParams = {
  targetIssueId: string
  type: import('@876/projects/contracts').IssueRelationType
}

export type CreateIssueDependencyParams = {
  predecessorIssueId: string
  successorIssueId: string
  type?: import('@876/projects/contracts').IssueDependencyType
  lagMinutes?: number
}

export type UpdateIssueDependencyParams = {
  type?: import('@876/projects/contracts').IssueDependencyType
  lagMinutes?: number
}
