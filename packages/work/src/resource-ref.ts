import { z } from 'zod'

import type { CreateWorkTaskLinkInput, WorkContext } from './types'

const resourceIdSchema = z.string().trim().min(1)

const safeResourceUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(
    (value) =>
      (value.startsWith('/') && !value.startsWith('//')) ||
      value.startsWith('https://') ||
      value.startsWith('http://'),
    { message: 'Use a relative application path or an HTTP(S) URL.' }
  )

/**
 * Opaque reference to a business record owned by another 876 bounded context.
 * Display metadata is optional and never authorizes access to the resource.
 */
export const workResourceRefSchema = z.strictObject({
  service: resourceIdSchema,
  resource: resourceIdSchema,
  externalId: resourceIdSchema,
  label: z.string().trim().min(1).max(240).optional(),
  url: safeResourceUrlSchema.optional(),
})
export type WorkResourceRef = z.infer<typeof workResourceRefSchema>

/** Host-supplied resource context consumed by Work-backed presentation. */
export type WorkHostContext = WorkResourceRef

/** Maps the public reference vocabulary onto Work's legacy context projection. */
export function toWorkContext(ref: WorkResourceRef): WorkContext {
  return {
    service: ref.service,
    resource: ref.resource,
    id: ref.externalId,
  }
}

/** Maps the same reference onto the canonical task-link create contract. */
export function toCreateWorkTaskLinkInput(
  ref: WorkResourceRef,
  isPrimary = true
): CreateWorkTaskLinkInput {
  return {
    service: ref.service,
    resource: ref.resource,
    externalId: ref.externalId,
    ...(ref.label ? { label: ref.label } : {}),
    ...(ref.url ? { url: ref.url } : {}),
    isPrimary,
  }
}
