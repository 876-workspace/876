import 'server-only'

import { apiJson } from '@876/core/api'
import type { ResourceLink } from '@876/storage'
import { z } from 'zod'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { projectsErrorStatus } from '@/app/api/_lib/error-status'
import {
  ATTACHMENT_RELATION,
  attachmentCaller,
  attachmentResourceTypes,
} from '@/lib/attachments'
import type { AttachmentResourceType } from '@/lib/attachments'
import { PROJECTS_APP_SLUG } from '@/lib/projects-app'
import { storage } from '@/lib/services/storage'

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

/**
 * Authorizes the actor to change the record an attachment hangs off.
 *
 * New work-item records answer to `issues.edit`; phases, task lists, projects
 * and comments sit behind the project-level permission. The routes parse the
 * body before calling this, because which permission applies is decided by the
 * `resourceType` the caller sent — not by the URL.
 */
export async function requireAttachmentAccess(
  resourceType: AttachmentResourceType
): Promise<ApiContext> {
  return requireApiAccess(
    resourceType === 'issue'
      ? { module: 'issues', permission: 'issues.edit' }
      : { module: 'projects', permission: 'projects.edit' }
  )
}

export function attachmentErrorResponse(
  error: { code: string; message: string } | null,
  fallbackMessage: string
): Response {
  return apiJson(
    { error: error?.message ?? fallbackMessage },
    {
      status: projectsErrorStatus(error?.code ?? ''),
      ...(error ? { code: error.code } : {}),
    }
  )
}

export function attachmentValidationResponse(): Response {
  return apiJson(
    { error: 'The attachment request is invalid.' },
    { status: 422 }
  )
}

type AttachmentLinkOutcome =
  | { data: ResourceLink; error: null }
  | { data: null; error: { code: string; message: string } }

const storageUnavailable = {
  code: 'storage/provider-error',
  message: 'The Storage response was unavailable.',
} as const

/**
 * Attaches a ready file to a record, reusing the link if there already is one.
 *
 * Completion is retryable — Storage returns the same file for a repeated
 * `complete` — so a naive create would leave the record with two identical
 * rows after a retry or a double click. The record's links are read first and
 * the existing one wins; the list is scoped to this app, resource and relation.
 */
export async function ensureAttachmentLink(input: {
  orgId: string
  userId: string
  resourceType: AttachmentResourceType
  resourceId: string
  fileId: string
}): Promise<AttachmentLinkOutcome> {
  const caller = attachmentCaller(input)
  const listed = await storage.resourceLinks.list(
    {
      app_id: PROJECTS_APP_SLUG,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      relation: ATTACHMENT_RELATION,
    },
    caller
  )
  if (listed.error || !listed.data)
    return { data: null, error: listed.error ?? storageUnavailable }

  const existing = listed.data.data.find(
    (link) => link.file_id === input.fileId
  )
  if (existing) return { data: existing, error: null }

  const created = await storage.resourceLinks.create(
    {
      file_id: input.fileId,
      app_id: PROJECTS_APP_SLUG,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      relation: ATTACHMENT_RELATION,
      owner_type: 'organization',
      owner_id: input.orgId,
      actor_user_id: input.userId,
    },
    caller
  )
  if (created.error || !created.data)
    return { data: null, error: created.error ?? storageUnavailable }

  return { data: created.data, error: null }
}
