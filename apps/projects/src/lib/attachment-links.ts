import 'server-only'

import {
  attachmentLinkListSchema,
  attachmentLinkSchema,
  deletedSchema,
  type AttachmentLink,
} from '@876/projects'
import { z } from 'zod'

import type { AttachmentLinksError } from '@/types/attachments'

const envelopeSchema = z.object({
  data: z.unknown().nullable(),
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
})

function baseUrl(): string {
  return (
    process.env.PROJECTS_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_PROJECTS_API_URL?.trim() ||
    'http://localhost:4030'
  )
}

function internalKey(): string | null {
  return process.env.PROJECTS_INTERNAL_KEY?.trim() || null
}

function root(orgId: string, projectId: string): string {
  return `/v1/organizations/${encodeURIComponent(orgId)}/projects/${encodeURIComponent(projectId)}/attachment-links`
}

async function callInternal<T>(
  path: string,
  init: RequestInit,
  schema: z.ZodType<T>
): Promise<{ data: T | null; error: AttachmentLinksError | null }> {
  const key = internalKey()
  if (!key)
    return {
      data: null,
      error: {
        code: 'projects/not-configured',
        message: 'The Projects service is not configured.',
        status: 502,
      },
    }

  let response: Response
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        'x-internal-key': key,
      },
    })
  } catch {
    return {
      data: null,
      error: {
        code: 'projects/unavailable',
        message: 'The Projects service could not be reached.',
        status: 502,
      },
    }
  }

  const envelope = envelopeSchema.safeParse(
    await response.json().catch(() => null)
  )
  if (!envelope.success)
    return {
      data: null,
      error: {
        code: 'projects/invalid-response',
        message: 'The Projects service returned an invalid response.',
        status: 502,
      },
    }
  if (envelope.data.error || !response.ok || envelope.data.data === null) {
    const code = envelope.data.error?.code ?? 'projects/request-failed'
    return {
      data: null,
      error: {
        code,
        message:
          envelope.data.error?.message ?? 'The files could not be loaded.',
        status: code === 'projects/attachment-not-found' ? 404 : 400,
      },
    }
  }
  const parsed = schema.safeParse(envelope.data.data)
  if (!parsed.success)
    return {
      data: null,
      error: {
        code: 'projects/invalid-response',
        message: 'The Projects service returned an invalid response.',
        status: 502,
      },
    }
  return { data: parsed.data, error: null }
}

/**
 * Project file links shared with clients.
 *
 * These rows live in the owning service next to the client grants (not in
 * Storage: Storage links carry no visibility flag), and the typed package
 * has no internal verbs for them yet, so this thin helper issues the same
 * internal calls the package would. Only `clientVisible` rows ever reach
 * the portal; the portal filters server-side regardless.
 */
export async function listAttachmentLinks(
  orgId: string,
  projectId: string
): Promise<{
  data: AttachmentLink[] | null
  error: AttachmentLinksError | null
}> {
  const result = await callInternal(
    root(orgId, projectId),
    {},
    attachmentLinkListSchema
  )
  if (result.error || !result.data) return { data: null, error: result.error }
  return { data: result.data.data, error: null }
}

export async function createAttachmentLink(
  orgId: string,
  projectId: string,
  input: { url: string; name?: string; createdBy: string }
): Promise<{
  data: AttachmentLink | null
  error: AttachmentLinksError | null
}> {
  return callInternal(
    root(orgId, projectId),
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    },
    attachmentLinkSchema
  )
}

export async function deleteAttachmentLink(
  orgId: string,
  projectId: string,
  attachmentId: string
): Promise<{
  data: { deleted: boolean } | null
  error: AttachmentLinksError | null
}> {
  const result = await callInternal(
    `${root(orgId, projectId)}/${encodeURIComponent(attachmentId)}`,
    { method: 'DELETE' },
    deletedSchema
  )
  if (result.error || !result.data) return { data: null, error: result.error }
  return { data: { deleted: true }, error: null }
}
