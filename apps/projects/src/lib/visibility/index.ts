import 'server-only'

import {
  commentSchema,
  visibilityResultSchema,
  type VisibilityResult,
} from '@876/projects'
import { milestoneCommentSchema } from '@876/projects/contracts'
import { z } from 'zod'

import type { VisibilityError, VisibilitySubject } from '@/types/visibility'

type VisibilityOutcome = {
  data: VisibilityResult | null
  error: VisibilityError | null
}

const envelopeSchema = z.object({
  data: z.unknown().nullable(),
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
})

const clientVisibleSchema = z
  .object({ clientVisible: z.boolean().optional() })
  .passthrough()

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

function subjectPath(orgId: string, subject: VisibilitySubject): string {
  const org = encodeURIComponent(orgId)
  switch (subject.kind) {
    case 'issue':
      return `/v1/organizations/${org}/issues/${encodeURIComponent(subject.issueRef)}/client-visibility`
    case 'issue-comment':
      return `/v1/organizations/${org}/issues/${encodeURIComponent(subject.issueRef)}/comments/${encodeURIComponent(subject.commentId)}/client-visibility`
    case 'phase':
      return `/v1/organizations/${org}/milestones/${encodeURIComponent(subject.phaseId)}/client-visibility`
    case 'phase-comment':
      return `/v1/organizations/${org}/milestones/${encodeURIComponent(subject.phaseId)}/comments/${encodeURIComponent(subject.commentId)}/client-visibility`
    case 'attachment-link':
      return `/v1/organizations/${org}/projects/${encodeURIComponent(subject.projectId)}/attachment-links/${encodeURIComponent(subject.attachmentId)}/client-visibility`
  }
}

function toError(code: string, message: string): VisibilityError {
  if (
    code === 'projects/issue-not-found' ||
    code === 'projects/comment-not-found' ||
    code === 'projects/milestone-not-found' ||
    code === 'projects/attachment-not-found' ||
    code === 'projects/client-grant-not-found'
  )
    return { code, message, status: 404 }
  return { code, message, status: 400 }
}

/**
 * Toggles per-record client visibility against the owning service.
 *
 * The typed package has no visibility verbs for issues, milestones, or
 * comments yet (only discussions do), so this thin helper issues the same
 * internal `PATCH .../client-visibility` call the package would and
 * validates the answer with the shared `visibilityResultSchema`. Migrate
 * each kind to the package client once it gains the verb; the route
 * handlers calling this must not change shape.
 */
export async function setRecordVisibility(
  orgId: string,
  subject: VisibilitySubject,
  clientVisible: boolean
): Promise<VisibilityOutcome> {
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
    response = await fetch(`${baseUrl()}${subjectPath(orgId, subject)}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-internal-key': key,
      },
      body: JSON.stringify({ clientVisible }),
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
  if (envelope.data.error || !response.ok)
    return {
      data: null,
      error: toError(
        envelope.data.error?.code ?? 'projects/update-failed',
        envelope.data.error?.message ?? 'The visibility could not be updated.'
      ),
    }
  const parsed = visibilityResultSchema.safeParse(envelope.data.data)
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

const issueVisibilitySchema = z
  .object({ clientVisible: z.boolean().optional() })
  .passthrough()
const issueCommentVisibilitySchema = commentSchema.extend({
  clientVisible: z.boolean().optional(),
})
const phaseCommentVisibilitySchema = milestoneCommentSchema.extend({
  clientVisible: z.boolean().optional(),
})

async function getInternal<T>(
  path: string,
  schema: z.ZodType<T>
): Promise<{ data: T | null; error: VisibilityError | null }> {
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
      headers: { 'x-internal-key': key },
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
  if (
    !envelope.success ||
    envelope.data.error ||
    !response.ok ||
    envelope.data.data === null
  )
    return {
      data: null,
      error: toError(
        envelope.data?.error?.code ?? 'projects/unavailable',
        envelope.data?.error?.message ?? 'The record could not be loaded.'
      ),
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
 * Reads the current client-visibility flag for a record whose typed read
 * model does not carry it yet. Used to seed the toggle; the parsed schema
 * only requires the flag itself so serializer additions never break it.
 */
export async function getIssueVisibility(
  orgId: string,
  issueRef: string
): Promise<boolean | null> {
  const result = await getInternal(
    `/v1/organizations/${encodeURIComponent(orgId)}/issues/${encodeURIComponent(issueRef)}`,
    issueVisibilitySchema
  )
  if (!result.data) return null
  return result.data.clientVisible ?? null
}

export async function getPhaseVisibility(
  orgId: string,
  phaseId: string
): Promise<boolean | null> {
  const result = await getInternal(
    `/v1/organizations/${encodeURIComponent(orgId)}/milestones/${encodeURIComponent(phaseId)}`,
    clientVisibleSchema
  )
  if (!result.data) return null
  return result.data.clientVisible ?? null
}

export async function listIssueCommentVisibility(
  orgId: string,
  issueRef: string
): Promise<Readonly<Record<string, boolean>>> {
  const result = await getInternal(
    `/v1/organizations/${encodeURIComponent(orgId)}/issues/${encodeURIComponent(issueRef)}/comments`,
    z
      .object({
        data: z.array(issueCommentVisibilitySchema),
      })
      .passthrough()
  )
  if (!result.data) return {}
  return Object.fromEntries(
    result.data.data
      .filter((comment) => comment.clientVisible !== undefined)
      .map((comment) => [comment.id, comment.clientVisible as boolean])
  )
}

export async function listPhaseCommentVisibility(
  orgId: string,
  phaseId: string
): Promise<Readonly<Record<string, boolean>>> {
  const result = await getInternal(
    `/v1/organizations/${encodeURIComponent(orgId)}/milestones/${encodeURIComponent(phaseId)}/comments`,
    z
      .object({
        data: z.array(phaseCommentVisibilitySchema),
      })
      .passthrough()
  )
  if (!result.data) return {}
  return Object.fromEntries(
    result.data.data
      .filter((comment) => comment.clientVisible !== undefined)
      .map((comment) => [comment.id, comment.clientVisible as boolean])
  )
}
