import { z } from 'zod'

export const ensureTenantBodySchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const tenantParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const tenantSerializedSchema = z.strictObject({
  object: z.literal('projects.tenant'),
  id: z.string(),
  organizationId: z.string(),
  triageProjectId: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type EnsureTenantInput = z.infer<typeof ensureTenantBodySchema>
export type TenantSerialized = z.infer<typeof tenantSerializedSchema>
