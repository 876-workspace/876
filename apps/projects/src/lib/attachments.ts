import { PROJECTS_APP_SLUG } from '@/lib/projects-app'

import type { AttachmentCaller } from '@/types/attachments'

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
