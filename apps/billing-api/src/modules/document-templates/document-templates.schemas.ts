import {
  documentTemplateLayoutKeySchema,
  documentTemplateOverridesSchema,
  documentTemplateSettingsSchema,
  documentTemplateTypeSchema,
} from '@876/core/document-templates'
import { brandingSchema, brandingUpdateSchema } from '@876/core/branding'
import { z } from 'zod'

export const documentTemplateIdParamsSchema = z.strictObject({
  templateId: z.string().min(1),
})

export const integrationDocumentTemplateIdParamsSchema =
  documentTemplateIdParamsSchema.extend({ organizationId: z.string().min(1) })

export const documentTemplateListQuerySchema = z.strictObject({
  documentType: documentTemplateTypeSchema.optional(),
})

export const documentTemplateResolvedQuerySchema = z.strictObject({
  documentType: documentTemplateTypeSchema,
  templateId: z.string().min(1).optional(),
})

export const documentTemplateCreateBodySchema = z.strictObject({
  documentType: documentTemplateTypeSchema,
  name: z.string().trim().min(1).max(80),
  layout: documentTemplateLayoutKeySchema,
  settings: documentTemplateOverridesSchema.optional().default({}),
  isDefault: z.boolean().optional().default(false),
})

export const documentTemplateUpdateBodySchema = z
  .strictObject({
    name: z.string().trim().min(1).max(80).optional(),
    layout: documentTemplateLayoutKeySchema.optional(),
    settings: documentTemplateOverridesSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Nothing to update.',
  })

export const documentTemplateSchema = z.strictObject({
  object: z.literal('document-template'),
  id: z.string(),
  documentType: documentTemplateTypeSchema,
  name: z.string(),
  layout: documentTemplateLayoutKeySchema,
  isDefault: z.boolean(),
  settings: documentTemplateOverridesSchema,
  resolvedSettings: documentTemplateSettingsSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const resolvedDocumentTemplateSchema = z.strictObject({
  object: z.literal('resolved-document-template'),
  documentType: documentTemplateTypeSchema,
  templateId: z.string().nullable(),
  name: z.string().nullable(),
  layout: documentTemplateLayoutKeySchema,
  settings: documentTemplateSettingsSchema,
  branding: brandingSchema,
})

export const brandingResourceSchema = z.strictObject({
  object: z.literal('branding'),
  ...brandingSchema.shape,
  updatedAt: z.number().int().nullable(),
})

export const deletedDocumentTemplateSchema = z.strictObject({
  object: z.literal('document-template'),
  id: z.string(),
  deleted: z.literal(true),
})

export { brandingUpdateSchema }

export type DocumentTemplateCreateBody = z.infer<
  typeof documentTemplateCreateBodySchema
>
export type DocumentTemplateUpdateBody = z.infer<
  typeof documentTemplateUpdateBodySchema
>
