import 'server-only'

import { apiJson } from '@876/core/api'
import { z } from 'zod'

import { setRecordVisibility } from '@/lib/visibility'
import { projects } from '@/lib/services/projects'
import type { VisibilitySubject } from '@/types/visibility'

const visibilitySchema = z.strictObject({ clientVisible: z.boolean() })

function coerceBody(body: unknown) {
  if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
    const record = body as Record<string, unknown>
    if (typeof record.clientVisible === 'string')
      return { clientVisible: record.clientVisible === 'true' }
  }
  return body
}

async function readBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json'))
    return request.json().catch(() => null)
  const form = await request.formData().catch(() => null)
  if (!form) return null
  const body: Record<string, string> = {}
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') body[key] = value
  }
  return body
}

/**
 * Shared client-visibility mutation. Every record type stays internal
 * until flipped, and only `projects.edit` may flip it.
 */
export async function handleVisibility(
  request: Request,
  input: {
    orgId: string
    subject:
      | VisibilitySubject
      | { kind: 'discussion'; projectId: string; discussionId: string }
  }
): Promise<Response> {
  const parsed = visibilitySchema.safeParse(coerceBody(await readBody(request)))
  if (!parsed.success)
    return apiJson(
      { error: 'Enter a valid visibility update.' },
      { status: 422 }
    )

  if (input.subject.kind === 'discussion') {
    const result = await projects.discussions.setClientVisibility(
      input.orgId,
      input.subject.projectId,
      input.subject.discussionId,
      parsed.data.clientVisible
    )
    if (result.error || !result.data)
      return apiJson(
        {
          error:
            result.error?.message ?? 'The visibility could not be updated.',
        },
        { status: 400 }
      )
    return apiJson({ data: result.data })
  }

  const result = await setRecordVisibility(
    input.orgId,
    input.subject,
    parsed.data.clientVisible
  )
  if (result.error || !result.data)
    return apiJson(
      {
        error: result.error?.message ?? 'The visibility could not be updated.',
      },
      { status: result.error?.status ?? 400 }
    )
  return apiJson({ data: result.data })
}
