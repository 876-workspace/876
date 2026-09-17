import { PROJECTS_APP_SLUG } from '@/lib/projects-app'

/**
 * What a Storage file can hang off in Projects.
 *
 * Projects owns no file table: a file is referenced only by the opaque `fileId`
 * carried on a Storage resource link. These are the `resourceType` values those
 * links may use, and `milestone` is what a phase detail page passes.
 */
import type {
  AttachmentCaller,
  AttachmentLinkRef,
  AttachmentResourceRef,
  AttachmentResourceType,
  AttachmentUploadSession,
} from '@/types/attachments'
import {
  ATTACHMENT_RELATION,
  attachmentResourceTypes,
} from '@/types/attachments'

export { ATTACHMENT_RELATION, attachmentResourceTypes }
export type {
  AttachmentCaller,
  AttachmentLinkRef,
  AttachmentResourceRef,
  AttachmentResourceType,
  AttachmentUploadSession,
}

/**
 * The principal Projects claims to be acting for when it reaches Storage.
 *
 * Storage authenticates a service, not a person: it cannot tell whether the
 * caller may touch an organization-owned file unless the app names the actor
 * and the organization. Every file call must carry one.
 */

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
