import { PROJECTS_APP_SLUG } from '@/lib/projects-app'

/**
 * What a Storage file can hang off in Projects.
 *
 * Projects owns no file table: a file is referenced only by the opaque `fileId`
 * carried on a Storage resource link. These are the `resourceType` values those
 * links may use, and `milestone` is what a phase detail page passes.
 */
export const attachmentResourceTypes = [
  'project',
  'milestone',
  'task-list',
  'issue',
  'comment',
] as const

export type AttachmentResourceType = (typeof attachmentResourceTypes)[number]

/** The link relation every attachment in this app uses. */
export const ATTACHMENT_RELATION = 'attachment'

/**
 * The principal Projects claims to be acting for when it reaches Storage.
 *
 * Storage authenticates a service, not a person: it cannot tell whether the
 * caller may touch an organization-owned file unless the app names the actor
 * and the organization. Every file call must carry one.
 */
export type AttachmentCaller = {
  sourceAppId: string
  actorUserId: string
  actorOrgId: string
}

export function attachmentCaller(actor: {
  orgId: string
  userId: string
}): AttachmentCaller {
  return {
    sourceAppId: PROJECTS_APP_SLUG,
    actorUserId: actor.userId,
    actorOrgId: actor.orgId,
  }
}

/** The record an attachment hangs off. */
export type AttachmentResourceRef = {
  resourceType: AttachmentResourceType
  resourceId: string
}

/** The signed session the browser needs to `PUT` bytes straight to the provider. */
export type AttachmentUploadSession = {
  sessionId: string
  fileId: string
  uploadUrl: string
  method: 'PUT'
  headers: { 'Content-Type': string; 'Content-Length': string }
  expiresAt: number
}

/** A created link, as the browser names it afterwards. */
export type AttachmentLinkRef = {
  linkId: string
  fileId: string
}
